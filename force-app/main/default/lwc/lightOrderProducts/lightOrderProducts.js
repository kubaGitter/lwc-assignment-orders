import { LightningElement, wire, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecord } from 'lightning/uiRecordApi';
import  getOrderProducts from '@salesforce/apex/OrderProductsController.getOrderProducts';
import  activateOrder from '@salesforce/apex/OrderProductsController.activateOrder';

const FIELDS = ['Order.Pricebook2Id', 'Order.StatusCode'];
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
    orderItems;
    error;
    wiredData;
    pbId;
    orderStatus;
    @api recordId;
    @track sortedBy;
    @track sortedDirection;
    @track wasActivated;
    
    
    
    @wire(getRecord, { recordId: '$recordId', fields: FIELDS}) 
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
        console.log('handleActivate(evt)');
        activateOrder( { orderId: this.recordId } )
            .then(result => {
                this.wasActivated = true;
                console.log('Success at activation');
            })
            .catch(error => {
                console.log('Error at activation: ' +JSON.stringify(error));
                this.dispatchToast(error.body.message, 'error');
            });
    }

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

    dispatchToast(msg, type) {
        this.dispatchEvent(
            new ShowToastEvent({
                message: msg,
                variant: type
            })
        );
    }

}