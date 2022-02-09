import { LightningElement, wire, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecord } from 'lightning/uiRecordApi';
import getAvailableProducts from '@salesforce/apex/AvailableProductsController.getAvailableProducts';
import addProductToOrder from '@salesforce/apex/AvailableProductsController.addProductToOrder';

import { publish, subscribe, MessageContext } from 'lightning/messageService';
import PRODUCT_ADDED_CHANNEL from '@salesforce/messageChannel/productAddedToOrder__c';
import PRODUCTS_ORDERED_CHANNEL from '@salesforce/messageChannel/productsOrdered__c';

const FIELDS = ['Order.Pricebook2Id'];
const COLS = [
    {
        label: 'Product Name', 
        fieldName: 'ProductName', 
        type: 'text', 
        cellAttributes: {
            iconName: { 
                fieldName: 'trendIcon ' 
            },
            iconPosition: 'right'
        },
        sortable: 'true'
    },
    {
        label: 'List Price',
        fieldName: 'UnitPrice',
        type: 'currency',
        typeAttributes: { 
            currencyCode: 'EUR', 
            step: '0.01' 
        }
    },
    {
        label: 'Already ordered?',
        fieldName: 'UnitPrice',
        type: 'currency',
        typeAttributes: { 
            currencyCode: 'EUR', 
            step: '0.01' 
        }
    },
    {
        label: 'Order',
        type: 'button-icon',
        initialWidth: 75,
        typeAttributes: {
            iconName: 'utility:add',
            title: 'Add to Order',
            variant: 'border-filled',
            alternativeText: 'Add to Order',
            name: 'add'
        }
    },
    {
        type: 'action',
        typeAttributes: { 
            rowActions: [{
                label: 'Add to Order',
                name: 'add' 
            }]
        }
    }
];



export default class AvailableProducts extends LightningElement {

    @api recordId;
    subscription = null;
    availProds = [];
    orderedProds = [];
    orderProdIds = [];
    columns = COLS;

    @wire(MessageContext)
    messageContext;
    
    @wire(getRecord, { recordId: '$recordId', fields: FIELDS}) 
    order;
    
    get pbId() {
        return this.order.data.fields.Pricebook2Id.value;
    }

    //01s1X000003xSJIQA2
    @wire(getAvailableProducts, { pricebookId: '$order.data.fields.Pricebook2Id.value' }) 
    //@wire(getAvailableProducts, { pricebookId: '$pbId' }) 
    wiredAvailProds({ error, data }) {
        if (data) {
            let arrOfProds = [];
            console.log(JSON.stringify(data));
            if(this.orderedProds) {
                this.orderedProds.forEach(orderedRow => {
                    let flattenedRow = {};
                    flattenedRow.Id = orderedRow.PbeId;
                    flattenedRow.ProductName = orderedRow.ProductName;
                    flattenedRow.UnitPrice = orderedRow.UnitPrice;
                    arrOfProds.push(flattenedRow);
                });
            }
            //orderedProdIds = [];
            //this.orderedProds.forEach(item => { orderProdIds.push(item.PbeId) });
            data.forEach(row => {
                if (!this.orderProdIds.includes(row.Id)) {
                    let flattenedRow = {};
                    flattenedRow.Id = row.Id;
                    flattenedRow.ProductName = row.Product2.Name;
                    flattenedRow.UnitPrice = row.UnitPrice;
                    arrOfProds.push(flattenedRow);
                }
            });
            this.availProds = arrOfProds;
            console.log(JSON.stringify(this.availProds));
            //this.data = this.availProds;
            this.error = undefined;
        }
        else if (error) {
            this.availProds = undefined;
            this.error = error;
        }
    };
    
    handleClick(evt) {
        console.log(JSON.stringify(this.availProds));
        console.log(JSON.stringify(this.order.data));
        console.log('pricebook Id of current order is: ' +JSON.stringify(this.order.data.fields.Pricebook2Id.value));
    }

    handleRowAction(evt) {
        const actionName = evt.detail.action.name;
        const row = evt.detail.row;
        console.log('event data: '+ JSON.stringify(row));
        switch ( actionName ) {
            case 'add':
                // add product to the order
                addProductToOrder({ orderId: this.recordId, pbeId: row.Id, unitPrice: row.UnitPrice })
                    .then(result => {
                        //this.contacts = result;
                        console.log('product should be added now to the order');
                        this.dispatchToastInfo('Product added to the Order!');
                        
                        const payload = { orderId: this.recordId, pbeId: row.Id };
                        publish(this.messageContext, PRODUCT_ADDED_CHANNEL, payload);
                        console.log('sending an event');
                    })
                    .catch(error => {
                        console.log('error while adding product to the order: ' + JSON.stringify(error));
                        console.log('PBE used is: ' + row.Id);
                        this.error = error;
                        this.dispatchToastError('Error while adding product to the Order!');
                    });
                break;
            default:
        }
    }

    dispatchToastInfo(msg) {
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: msg,
                variant: 'success'
            })
        );
    }

    dispatchToastError(err) {
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Error',
                message: err,
                variant: 'error'
            })
        );
    }

    

    // Respond to UI event by publishing message
    handleContactSelect(event) {
        
    }

    // Encapsulate logic for LMS subscribe.
    subscribeToMessageChannel() {
        console.log('availableProducts - subscribing to PRODUCTS_ORDERED_CHANNEL event');
        this.subscription = subscribe(
            this.messageContext,
            PRODUCTS_ORDERED_CHANNEL,
            (message) => this.handleMessage(message)
        );
    }

    // Handler for message received by component
    handleMessage(message) {
        console.log('handling PRODUCTS_ORDERED_CHANNEL event received!');
        console.log('products already ordered received from message: ' +JSON.stringify(message.orderedProds));
        this.orderProdIds = [];
        message.orderedProds.forEach(item => { this.orderProdIds.push(item.PbeId) });
        console.log('ids of products already ordered received from message: ' +JSON.stringify(this.orderProdIds));
        this.orderedProds = message.orderedProds;
        //this.recordId = message.recordId;
        //refreshApex(this.wiredOrderProducts({ error, data }));
        //refreshApex(this.getOrderProducts);
        //refreshApex(this.wiredDataResult);
    }

    // Standard lifecycle hooks used to sub/unsub to message channel
    connectedCallback() {
        this.subscribeToMessageChannel();
    }

}