import { LightningElement, wire, track, api } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import  getOrderProducts from '@salesforce/apex/OrderProductsController.getOrderProducts';

import { subscribe, publish, MessageContext } from 'lightning/messageService';
import PRODUCT_ADDED_CHANNEL from '@salesforce/messageChannel/productAddedToOrder__c';
import PRODUCTS_ORDERED_CHANNEL from '@salesforce/messageChannel/productsOrdered__c';

const COLS = [
    {
        label: 'Name', 
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
        label: 'Unit Price',
        fieldName: 'UnitPrice',
        type: 'currency',
        typeAttributes: { 
            currencyCode: 'EUR', 
            step: '0.01' 
        }
    },
    {
        label: 'Quantity',
        fieldName: 'Quantity',
        type: 'integer',
    },
    {
        label: 'Total Price',
        fieldName: 'TotalPrice',
        type: 'currency',
        typeAttributes: { 
            currencyCode: 'EUR', 
            step: '0.01' 
        }
    }
];

export default class OrderProducts extends LightningElement {

    columns = COLS;
    subscription = null;
    wiredDataResult;
    @api recordId;
    @track orderProds = [];
    @track error;

    @wire(MessageContext)
    messageContext;

    @wire(getOrderProducts, { orderId: '$recordId' }) 
    wiredOrderProducts(result) {
        this.wiredDataResult = result;
        if (result.data) {
            let arrayOfProd = [];
            result.data.forEach(row => {
                let flattenedRow = {};
                flattenedRow.Id = row.Id;
                flattenedRow.PbeId = row.PricebookEntryId;
                flattenedRow.ProductName = row.Product2.Name;
                flattenedRow.Quantity = row.Quantity;
                flattenedRow.UnitPrice = row.UnitPrice;
                flattenedRow.TotalPrice = row.TotalPrice;
                arrayOfProd.push(flattenedRow);
            });
            this.orderProds = arrayOfProd;
            console.log(this.orderProds);

            const payload = { orderId: this.recordId, orderedProds: arrayOfProd };
            console.log('PRODUCTS_ORDERED_CHANNEL payload: ' +JSON.stringify(payload));
            publish(this.messageContext, PRODUCTS_ORDERED_CHANNEL, payload);
        }
        else if (result.error) {
            this.orderProds = undefined;
            this.error = result.error;
        }
    }

    // Encapsulate logic for LMS subscribe.
    subscribeToMessageChannel() {
        console.log('orderProducts - subscribing to PRODUCT_ADDED_CHANNEL event');
        this.subscription = subscribe(
            this.messageContext,
            PRODUCT_ADDED_CHANNEL,
            (message) => this.handleMessage(message)
        );
    }

    // Handler for message received by component
    handleMessage(message) {
        console.log('handling PRODUCT_ADDED_CHANNEL event received!');
        //this.recordId = message.recordId;
        //refreshApex(this.wiredOrderProducts({ error, data }));
        //refreshApex(this.getOrderProducts);
        refreshApex(this.wiredDataResult);
    }

    // Standard lifecycle hooks used to sub/unsub to message channel
    connectedCallback() {
        this.subscribeToMessageChannel();
    }
}