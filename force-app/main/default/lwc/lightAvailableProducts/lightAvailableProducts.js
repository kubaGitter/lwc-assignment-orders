import { LightningElement, wire, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecord } from 'lightning/uiRecordApi';
import { reduceErrors } from 'c/ldsUtils';

import ORDER_STATUSCODE_FIELD from '@salesforce/schema/Order.StatusCode';
import ORDER_PRICEBOOKID_FIELD from '@salesforce/schema/Order.Pricebook2Id';

import getAvailableProducts from '@salesforce/apex/AvailableProductsController.getAvailableProducts';

import { publish, subscribe, MessageContext } from 'lightning/messageService';
import PRODUCT_ADDED_CHANNEL from '@salesforce/messageChannel/productAddedToOrder__c';
import ORDER_ACTIVATED_CHANNEL from '@salesforce/messageChannel/orderActivated__c';

const FIELDS = ['Order.Pricebook2Id', 'Order.StatusCode'];


export default class LightAvailableProducts extends LightningElement {

    @track columns = [
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
                name: 'addToOrder',
                disabled: false
            }
        }
    ];

    subscription = null;
    pbId;
    @track wiredData;
    @track wiredOrder;
    @track availableProds;
    error;
    @track orderStatus;
    @api recordId;
    @track canAddToOrder = true;

    @wire(MessageContext)
    messageContext;

    @wire(getRecord, { recordId: '$recordId', fields: [ORDER_STATUSCODE_FIELD, ORDER_PRICEBOOKID_FIELD]}) 
    wiredOrder(result) {
        this.wiredOrder = result;
        if (result.data) {
            console.log('[AvailableProducts][getRecord] Getting Order record = ' +JSON.stringify(result));
            this.pbId = result.data.fields.Pricebook2Id.value;
            this.orderStatus = result.data.fields.StatusCode.value;
            console.log('[AvailableProducts][getRecord] pbId = ' +this.pbId);
            console.log('[AvailableProducts][getRecord] orderStatus = ' +this.orderStatus);
            console.log('[AvailableProducts][getRecord] Columns[2] BEFORE = ' +JSON.stringify(this.columns[2]));
            let tmpCols = JSON.parse(JSON.stringify(this.columns));
            console.log('[AvailableProducts][getRecord] tmpCols = ' +JSON.stringify(tmpCols));

            if (this.orderStatus == 'Activated') {
                tmpCols[2].typeAttributes.disabled = true;
            }
            else {
                tmpCols[2].typeAttributes.disabled = false;
            }
            this.columns = tmpCols;
            console.log('[AvailableProducts][getRecord] Columns[2] AFTER = ' +JSON.stringify(this.columns[2]));
            //refreshApex(this.wiredOrder);
            console.log('[AvailableProducts][getRecord] Order column disabled? = ' +this.columns[2].typeAttributes.disabled);
            //this.refreshActionButtons();
            //this.columns[2].typeAttributes.disabled = result.data.fields.StatusCode.value == 'Activated' ? true : false;
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

    

    // Use standard lifecycle hook to subscribe to message channel
    connectedCallback() {
        this.subscribeToMessageChannel();
    }

    /*
    renderedCallback() {
        console.log('RENDEREDCALLBACK - columns=' +JSON.stringify(this.columns));
        console.log('RENDEREDCALLBACK - columns[2]=' +JSON.stringify(this.columns[2]));
        console.log('RENDEREDCALLBACK - columns[2].disabled=' +JSON.stringify(this.columns[2].typeAttributes.disabled));
        this.columns[2].typeAttributes.disabled = true;
        //this.columns.forEach(col => { col.typeAttributes.disabled = true });
    }
    */

    subscribeToMessageChannel() {
        console.log('[AvailableProductsLWC][subscribeToMessageChannel] Subscribing to ORDER_ACTIVATED_CHANNEL message');
        this.subscription = subscribe(
            this.messageContext,
            ORDER_ACTIVATED_CHANNEL,
            (message) => this.handleOrderActivatedMessage(message)
            );
        }
        
    handleOrderActivatedMessage(message) {
        console.log('[AvailableProductsLWC][handleOrderActivatedMessage] Handle ORDER_ACTIVATED_CHANNEL message');
        this.canAddToOrder = false;
        this.refreshActionButtons();
    }


    
    /* HELPER METHODS */

    refreshActionButtons() {
        // Update disabled attribute on Order column in datatable
        this.columns[2].typeAttributes.disabled = this.orderStatus == 'Activated' ? true : false;
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