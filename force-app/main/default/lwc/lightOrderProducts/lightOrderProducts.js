import { LightningElement, wire, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import { reduceErrors } from 'c/ldsUtils';
import { getRecord } from 'lightning/uiRecordApi';
import { createRecord } from 'lightning/uiRecordApi';
import { updateRecord } from 'lightning/uiRecordApi';

//import ORDERITEM_OBJECT from '@salesforce/schema/OrderItem';
import ORDER_STATUSCODE_FIELD from '@salesforce/schema/Order.StatusCode';

import  getOrderProducts from '@salesforce/apex/OrderProductsController.getOrderProducts';
import  activateOrder from '@salesforce/apex/OrderProductsController.activateOrder';

import { subscribe, publish, MessageContext } from 'lightning/messageService';
import PRODUCT_ADDED_CHANNEL from '@salesforce/messageChannel/productAddedToOrder__c';
import ORDER_ACTIVATED_CHANNEL from '@salesforce/messageChannel/orderActivated__c';
//import OrderProducts from '../orderProducts/orderProducts';


//const FIELDS = ['Order.Pricebook2Id', 'Order.StatusCode'];
const COLS = [
    {
        label: 'Product Name',
        fieldName: 'Name',
        type: 'text',
        sortable: true
    },
    {
        label: 'Unit Price',
        fieldName: 'UnitPrice',
        type: 'currency'
    },
    {
        label: 'Quantity',
        fieldName: 'Quantity',
        type: 'number'
    },
    {
        label: 'Total Price',
        fieldName: 'TotalPrice',
        type: 'currency'
    }    
];

export default class LightOrderProducts extends LightningElement {

    columns = COLS;
    subscription = null;
    orderItems;
    error;
    wiredData;
    pbId;
    orderStatus;
    @api recordId;
    @track sortedBy;
    @track sortedDirection;
    @track wasActivated;
    

    @wire(MessageContext)
    messageContext;
    
    @wire(getRecord, { recordId: '$recordId', fields: [ORDER_STATUSCODE_FIELD]}) 
    wiredOrder(result) {
        if (result.data) {
            this.orderStatus = result.data.fields.StatusCode.value;
            this.wasActivated = this.orderStatus == 'Activated' ? true : false;
            this.error = undefined;
        }
        else if (result.error) {
            this.error = result.error;

        }
    }
    /*order;
    get pbId() {
        return this.order.data.fields.Pricebook2Id.value;
    }
    get orderStatus() {
        return this.order.data.fields.StatusCode.value;
    }*/

    
    @wire(getOrderProducts, { orderId: '$recordId' })
    wiredOrderProducts(result) {
        this.wiredData = result;
        if (result.data) {
            let items = [];
            result.data.forEach(element => {
                let item = {};
                item.OiId = element.Id;
                item.PbeId = element.PricebookEntryId;
                item.Name = element.Product2.Name;
                item.UnitPrice = element.UnitPrice;
                item.Quantity = element.Quantity;
                item.TotalPrice = element.TotalPrice;
                items.push(item);
            });
            this.orderItems = items;
            this.error = undefined;
        }
        else if (result.error) {
            this.orderItems = undefined;
            this.error = result.error;
        }
        console.log('wiredOrderProducts - statusCode: ' +this.orderStatus);
    }

    handleActivate(evt) {
        const recordInput = { 
            fields: 
            {
                Id: this.recordId,
                Status: 'Activated'
            }
        };
        console.log('[OrderProductsLWC][handleActivate] RecordInput for updateRecord = ' +JSON.stringify(recordInput));
        updateRecord(recordInput)
            .then((oi) => {
                refreshApex(this.wiredData);
                //this.dispatchActivationMessage();
                this.dispatchToastSuccess('Order activated!');
            })
            .catch((error) => {
                console.log('[OrderProductsLWC][handleActivate] updateRecord failed with error = ' +JSON.stringify(error));
                this.dispatchToastError('Error while activating order!');
            });
    }

    /*
    handleActivate(evt) {
        console.log('handleActivate(evt)');
        activateOrder( { orderId: this.recordId } )
            .then(result => {
                this.wasActivated = true;
                this.dispatchToast('Order activated!', 'success');
                this.dispatchActivationMessage();
                console.log('Success at activation');
                // force refresh of the page to reflect the change of status
                eval("$A.get('e.force:refreshView').fire();");
            })
            .catch(error => {
                console.log('Error at activation: ' +JSON.stringify(error));
                this.dispatchToast(error.body.message, 'error');
            });
    }
    */

    handleColumnSorting(event) {
        var fieldName = event.detail.fieldName;
        var sortDirection = event.detail.sortDirection;
        // assign the latest attribute with the sorted column fieldName and sorted direction
        this.sortedBy = fieldName;
        this.sortedDirection = sortDirection;
        this.data = this.sortData(fieldName, sortDirection);
   }

    sortData(fieldname, direction) {
        let parseData = JSON.parse(JSON.stringify(this.orderItems));
        // Return the value stored in the field
        let keyValue = (a) => {
            return a[fieldname];
        };
        // checking reverse direction
        let isReverse = direction === 'asc' ? 1 : -1;
        // sorting data
        parseData.sort((x, y) => {
            x = keyValue(x) ? keyValue(x) : ''; // handling null values
            y = keyValue(y) ? keyValue(y) : '';
            // sorting values based on direction
            return isReverse * ((x > y) - (y > x));
        });
        this.orderItems = parseData;
    }


    // Use standard lifecycle hook to subscribe to message channel
    connectedCallback() {
        this.subscribeToMessageChannel();
    }

    subscribeToMessageChannel() {
        console.log('[OrderProductsLWC][subscribeToMessageChannel] Subscribing to PRODUCT_ADDED_CHANNEL message');
        this.subscription = subscribe(
            this.messageContext,
            PRODUCT_ADDED_CHANNEL,
            (message) => this.handleProductAddedMessage(message)
            );
    }
        
    handleProductAddedMessage(message) {
        console.log('[OrderProductsLWC][handleProductAddedMessage] Message received = ' +JSON.stringify(message));
        console.log('[OrderProductsLWC][handleProductAddedMessage] this-orderItems = ' +JSON.stringify(this.orderItems));
        const alreadyOrdered = this.orderItems.map(item => item.PbeId).includes(message.orderedProds.PbeId);
        console.log('[OrderProductsLWC][handleProductAddedMessage] alreadyOrdered? = ' +alreadyOrdered);

        if (alreadyOrdered) {
            // Among items which are already ordered, I'm checking for one which matches PricebookEntry which was provided in the message
            const orderItem = this.orderItems.find(item => item.PbeId == message.orderedProds.PbeId);
            let oiId = orderItem.OiId;
            let oiNewQuantity = orderItem.Quantity+1;
            console.log('[OrderProductsLWC][handleProductAddedMessage] Id of already ordered item = '+JSON.stringify(orderItem));
            const recordInput = { 
                fields: 
                {
                    Id: oiId,
                    Quantity: oiNewQuantity
                }
            };
            console.log('[OrderProductsLWC][handleProductAddedMessage] RecordInput for updateRecord = ' +JSON.stringify(recordInput));
            updateRecord(recordInput)
                .then((oi) => {
                    refreshApex(this.wiredData);
                    this.dispatchToastSuccess('Quantity of selected product has been increased!');
                })
                .catch((error) => {
                    console.log('[OrderProductsLWC][handleProductAddedMessage] updateRecord failed with error = ' +JSON.stringify(error));
                    this.dispatchToastError('Error while increasing quantity of the product');
                });
        }

        else {
            const recordInput = { 
                apiName: 'OrderItem',
                fields: 
                {
                    OrderId: message.orderId,
                    PricebookEntryId: message.orderedProds.PbeId,
                    Quantity: 1,
                    UnitPrice: message.orderedProds.UnitPrice
                }
            };
            console.log('[OrderProductsLWC][handleProductAddedMessage] RecordInput for createRecord = ' +JSON.stringify(recordInput));
            createRecord(recordInput)
                .then((oi) => {
                    refreshApex(this.wiredData);
                    this.dispatchToastSuccess('Product has been added to the Order!');
                })
                .catch((error) => {
                    console.log('[OrderProductsLWC][handleProductAddedMessage] createRecord failed with error = ' +JSON.stringify(error));
                    this.dispatchToastError('Error while adding product to the Order');
                });
        }
    }



    /* HELPER METHODS */

    dispatchActivationMessage() {
        const payload = { orderId: this.recordId };
        publish(this.messageContext, ORDER_ACTIVATED_CHANNEL, payload);
        console.log('[OrderProductsLWC][dispatchActivationMessage] Sending ORDER_ACTIVATED_CHANNEL message = ' +JSON.stringify(payload));
    }

    dispatchToast(msg, type) {
        this.dispatchEvent(
            new ShowToastEvent({
                message: reduceErrors(msg).join(', '),
                variant: type
            })
        );
    }

    dispatchToastSuccess(msg) {
        this.dispatchEvent(
            new ShowToastEvent({
                message: msg,
                variant: 'success'
            })
        );
    }

    dispatchToastError(errMsg) {
        this.dispatchEvent(
            new ShowToastEvent({
                message: errMsg,
                variant: 'error'
            })
        );
    }

}