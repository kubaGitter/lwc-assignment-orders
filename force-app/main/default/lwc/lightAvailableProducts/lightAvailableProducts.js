import { LightningElement, wire, api, track } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecord } from 'lightning/uiRecordApi';
//import { reduceErrors } from 'c/ldsUtils';

import ORDER_STATUSCODE_FIELD from '@salesforce/schema/Order.StatusCode';
import ORDER_PRICEBOOKID_FIELD from '@salesforce/schema/Order.Pricebook2Id';

import getAvailableProducts from '@salesforce/apex/AvailableProductsController.getAvailableProducts';

import { publish, subscribe, MessageContext } from 'lightning/messageService';
import PRODUCT_ADDED_CHANNEL from '@salesforce/messageChannel/productAddedToOrder__c';
import PRODUCTS_ORDERED_CHANNEL from '@salesforce/messageChannel/productsOrdered__c';

const FIELDS = ['Order.Pricebook2Id', 'Order.StatusCode'];
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
            name: 'addToOrder',
            disabled: false
        }
    }
];

export default class LightAvailableProducts extends LightningElement {

    columns = COLS;
    subscription = null;
    pbId;
    wiredData; //@track
    wiredOrder; //@track
    @track availableProds; //@track
    orderProdIds;
    error;
    orderStatus; //@track
    @api recordId;
 
    @wire(MessageContext)
    messageContext;

    @wire(getRecord, { recordId: '$recordId', fields: [ORDER_STATUSCODE_FIELD, ORDER_PRICEBOOKID_FIELD]}) 
    wiredOrder(result) {
        this.wiredOrder = result;
        if (result.data) {
            console.log('[AvailableProducts][getRecord] Getting Order record = ' +JSON.stringify(result));
            this.pbId = result.data.fields.Pricebook2Id.value;
            this.orderStatus = result.data.fields.StatusCode.value;
            this.error = undefined;
            // Update action button ([+]) to add products to orders depending on status of the order.
            let tmpCols = JSON.parse(JSON.stringify(this.columns));
            tmpCols[2].typeAttributes.disabled = this.orderStatus == 'Activated' ? true : false;
            this.columns = tmpCols;
        }
        else if (result.error) {
            this.error = result.error;
            this.pbId = undefined;
            console.log('[AvailableProducts][getRecord] Error while getting Order record = ' +JSON.stringify(error));
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
            this.sortAvailableProducts();
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

    subscribeToMessageChannel() {
        console.log('[AvailableProductsLWC][subscribeToMessageChannel] Subscribing to PRODUCTS_ORDERED_CHANNEL message');
        this.subscription = subscribe(
            this.messageContext,
            PRODUCTS_ORDERED_CHANNEL,
            (message) => this.handleProductsOrderedMessage(message)
            );
        }
        
    handleProductsOrderedMessage(message) {
        console.log('[AvailableProductsLWC][handleProductsOrderedMessage] Handle PRODUCTS_ORDERED_CHANNEL message = ' +JSON.stringify(message));
        //console.log('[AvailableProductsLWC][handleProductsOrderedMessage] orderProdIds BEFORE updated = ' +JSON.stringify(this.orderProdIds));
        let tmpOrderProds = message.orderedPbeIds;
        this.orderProdIds = tmpOrderProds;
        //console.log('[AvailableProductsLWC][handleProductsOrderedMessage] orderProdIds AFTER updated = ' +JSON.stringify(this.orderProdIds));
        this.sortAvailableProducts();
    }
    
    sortAvailableProducts() {
        console.log('[AvailableProductsLWC][sortAvailableProducts] Sorting available products');
        /*
        this.availProds.sort((a, b) => {
            // Sorting by ordered products first
            return this.orderProdIds.includes(a.Id) && !this.orderProdIds.includes(b.Id) ? -1 : 1;
            // Sorting alphabetically
            //return a.ProductName > b.ProductName ? 1 : -1;
        })*/
        
        console.log('[AvailableProductsLWC][sortAvailableProducts] Available products BEFORE sorting = ' +JSON.stringify(this.availableProds));
        console.log('[AvailableProductsLWC][sortAvailableProducts] Ordered products = ' +JSON.stringify(this.orderProdIds));
        if (this.availableProds) {
            console.log('[AvailableProductsLWC][sortAvailableProducts] Actual sorting started');
            //let prods = this.availableProds;
            
            let prodsOrdered = this.availableProds.filter(item => { return this.orderProdIds.includes(item.PbeId) });
            console.log('[AvailableProductsLWC][sortAvailableProducts] prodsOrdered BEFORE = ' +JSON.stringify(prodsOrdered));
            let prodsNotOrdered = this.availableProds.filter(item => { return !this.orderProdIds.includes(item.PbeId) });
            console.log('[AvailableProductsLWC][sortAvailableProducts] prodsNotOrdered BEFORE = ' +JSON.stringify(prodsNotOrdered));
            
            prodsOrdered.sort((a, b) => a.ProductName > b.ProductName ? 1 : -1);
            console.log('[AvailableProductsLWC][sortAvailableProducts] prodsOrdered AFTER = ' +JSON.stringify(prodsOrdered));
            prodsNotOrdered.sort((a, b) => a.ProductName > b.ProductName ? 1 : -1);
            console.log('[AvailableProductsLWC][sortAvailableProducts] prodsNotOrdered AFTER = ' +JSON.stringify(prodsNotOrdered));

            let prodsSorted = [];
            prodsOrdered.forEach(item => prodsSorted.push(item));
            prodsNotOrdered.forEach(item => prodsSorted.push(item));
            //prodsSorted.push(prodsOrdered);
            //prodsSorted.push(prodsNotOrdered);
            this.availableProds = prodsSorted;

            /*
            prods.sort((a, b) => {
                let sortDecision;
                if (this.orderProdIds.includes(a.PbeId) && !this.orderProdIds.includes(b.PbeId)) {
                    return -1;
                }
                else {
                    return a.ProductName > b.ProductName ? 1 : -1;
                }
                //return this.orderProdIds.includes(a.PbeId) && !this.orderProdIds.includes(b.PbeId) ? -1 : 1;
            });
            this.availableProds = prods;
            */

            refreshApex(this.wiredData);
            console.log('[AvailableProductsLWC][sortAvailableProducts] Available products AFTER sorting = ' +JSON.stringify(this.availableProds));
        }
        else {
            console.log('[AvailableProductsLWC][sortAvailableProducts] Tried to sort available products but the array is empty now');
        }
        
        //this.wiredDataResult = [];
        //this.availProds = [];
        //this.wiredDataResult = prods;
        //this.wiredData = prods;
        
        //console.log('sortDatatable: ' +JSON.stringify(prods));
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