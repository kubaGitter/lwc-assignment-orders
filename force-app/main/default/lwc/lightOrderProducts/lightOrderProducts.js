import { LightningElement, wire, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import { reduceErrors } from 'c/ldsUtils';
import { getRecord } from 'lightning/uiRecordApi';
import { createRecord } from 'lightning/uiRecordApi';
import { updateRecord } from 'lightning/uiRecordApi';

import ORDER_STATUSCODE_FIELD from '@salesforce/schema/Order.StatusCode';

import  getOrderProducts from '@salesforce/apex/OrderProductsController.getOrderProducts';

import { subscribe, publish, MessageContext } from 'lightning/messageService';
import PRODUCT_ADDED_CHANNEL from '@salesforce/messageChannel/productAddedToOrder__c';
import PRODUCTS_ORDERED_CHANNEL from '@salesforce/messageChannel/productsOrdered__c';

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
    @track sortedBy = 'Name';
    @track sortedDirection = 'asc';
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
            this.sortData(this.sortedBy, this.sortedDirection);
            this.error = undefined;

            // Publish an event containing Ids of all Pricebook entries which are already ordered so that other components are aware
            const payload = { orderId: this.recordId, orderedPbeIds: this.orderItems.map(item => item.PbeId) };
            console.log('[OrderProductsLWC][getOrderProducts] Prepare payload and send PRODUCTS_ORDERED_CHANNEL message: ' +JSON.stringify(payload));
            publish(this.messageContext, PRODUCTS_ORDERED_CHANNEL, payload);
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
                this.dispatchToastSuccess('Order activated!');
            })
            .catch((error) => {
                console.log('[OrderProductsLWC][handleActivate] updateRecord failed with error = ' +JSON.stringify(error));
                this.dispatchToastError('Error while activating order!');
            });
    }

    handleColumnSorting(event) {
        var fieldName = event.detail.fieldName;
        var sortDirection = event.detail.sortDirection;
        this.sortedBy = fieldName;
        this.sortedDirection = sortDirection;
        this.data = this.sortData(fieldName, sortDirection);
   }

    sortData(fieldname, direction) {
        console.log('[OrderProducts][sortData] Sorting ordered products.')
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