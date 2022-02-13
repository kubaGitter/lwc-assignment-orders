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
        label: 'Product Name', 
        fieldName: 'ProductName', 
        type: 'text',
        sortable: true
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
    @track sortedBy = 'ProductName';
    @track sortedDirection = 'asc';
 
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
        // Update orderProdIds (i.e. list of Pricebook Entry Ids) based on the message
        let tmpOrderProds = message.orderedPbeIds;
        this.orderProdIds = tmpOrderProds;
        // Re-sorting is required as new product was added to the order
        this.sortAvailableProducts();
    }

    handleColumnSorting(event) {
        var fieldName = event.detail.fieldName;
        var sortDirection = event.detail.sortDirection;
        // assign the latest attribute with the sorted column fieldName and sorted direction
        this.sortedBy = fieldName;
        this.sortedDirection = sortDirection;
        this.data = this.sortAvailableProducts();
   }
    
    sortAvailableProducts() {
        console.log('[AvailableProductsLWC][sortAvailableProducts] Sorting available products');
        if (this.availableProds) {
            // Create separate arrays for products ordered and not ordered
            let prodsOrdered = this.availableProds.filter(item => { return this.orderProdIds.includes(item.PbeId) });
            let prodsNotOrdered = this.availableProds.filter(item => { return !this.orderProdIds.includes(item.PbeId) });

            // Sort alphabetically products ordered and not ordered (separately)
            let isReverse = this.sortedDirection === 'asc' ? 1 : -1;
            prodsOrdered.sort((a, b) => { return isReverse * (a.ProductName > b.ProductName ? 1 : -1); });
            prodsNotOrdered.sort((a, b) => { return isReverse * (a.ProductName > b.ProductName ? 1 : -1); });

            // Store results of sorting to availableProds and refresh
            let prodsSorted = [];
            prodsOrdered.forEach(item => prodsSorted.push(item));
            prodsNotOrdered.forEach(item => prodsSorted.push(item));
            this.availableProds = prodsSorted;
            refreshApex(this.wiredData);
        }
        else {
            console.log('[AvailableProductsLWC][sortAvailableProducts] Tried to sort available products but the array is empty now');
        }
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