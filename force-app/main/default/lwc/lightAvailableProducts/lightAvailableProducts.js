import { LightningElement, wire, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecord } from 'lightning/uiRecordApi';
import { reduceErrors } from 'c/ldsUtils';
import getAvailableProducts from '@salesforce/apex/AvailableProductsController.getAvailableProducts';

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
        type: 'currency'
    }
]

export default class LightAvailableProducts extends LightningElement {

    columns = COLS;
    pbId;
    wiredData;
    availableProds;
    error;
    @api recordId;

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
            console.log('@wire, wiredAvailableProducts: data=' +JSON.stringify(result.data));
        }
        else if (result.error) {
            this.availableProds = undefined;
            this.error = result.error;
            console.log('@wire, wiredAvailableProducts: error=' +JSON.stringify(result.error));
        }
    }

}