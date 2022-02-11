import { LightningElement, wire, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecord } from 'lightning/uiRecordApi';
import { reduceErrors } from 'c/ldsUtils';

import getAvailableProducts from '@salesforce/apex/AvailableProductsController.getAvailableProducts';

import { publish, MessageContext } from 'lightning/messageService';
import PRODUCT_ADDED_CHANNEL from '@salesforce/messageChannel/productAddedToOrder__c';

const FIELDS = ['Order.Pricebook2Id'];
const COLS = [
    {
        label: 'Name', 
        fieldName: 'ProductName', 
        type: 'text'
    },
    {
        label: 'List Price', 
        fieldName: 'UnitPrice', 
        type: 'currency',
        initialWidth: 125
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
            name: 'addToOrder'
        }
    }
]

export default class LightAvailableProducts extends LightningElement {

    columns = COLS;
    pbId;
    wiredData;
    availableProds;
    error;
    @api recordId;

    @wire(MessageContext)
    messageContext;

    @wire(getRecord, { recordId: '$recordId', fields: FIELDS}) 
    wiredOrder(result) {
        if (result.data) {
            this.pbId = result.data.fields.Pricebook2Id.value;
            this.error = undefined;
            console.log('@wire, getRecord: pdId=' +this.pbId);
        }
        else if (result.error) {
            this.error = result.error;
            this.pbId = undefined;
            console.log('@wire, getRecord: error=' +error);
        }
    }

    @wire(getAvailableProducts, { pricebookId: '$pbId' }) 
    wiredAvailableProducts(result) {
        this.wiredData = result;
        if (result.data) {
            let prods = [];
            result.data.forEach(element => {
                let prod = {};
                prod.PbeId = element.Id;
                prod.ProductName = element.Product2.Name;
                prod.UnitPrice = element.UnitPrice;
                prods.push(prod);
            });
            this.availableProds = prods;
            this.error = undefined;
            console.log('[@wire, wiredAvailableProducts] data=' +JSON.stringify(result.data));
        }
        else if (result.error) {
            this.availableProds = undefined;
            this.error = result.error;
            console.log('[@wire, wiredAvailableProducts] error=' +JSON.stringify(result.error));
            this.dispatchToastError(result.error.body.message);
        }
    }


    handleRowAction(evt) {
        console.log('[handleRowAction] event=' +JSON.stringify(evt));
        const actionName = evt.detail.action.name;
        const row = evt.detail.row;
        switch (actionName) {
            case 'addToOrder':
                // send message to orderProducts component to add an order item to the order
                console.log('[handleRowAction] sending addToOrder message');
                const payload = { orderId: this.recordId, orderedProds: row };
                console.log('[handleRowAction] PRODUCT_ADDED_CHANNEL payload: ' +JSON.stringify(payload));
                publish(this.messageContext, PRODUCT_ADDED_CHANNEL, payload);
                break;
        }
    }


    
    /* HELPER METHODS */

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