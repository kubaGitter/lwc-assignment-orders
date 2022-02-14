# Installation
This is sfdx project, please clone it and deploy to org (I used scratch org). It requires some data in place in order to demonstrate how it works. The Order_Record_Page_Light flexi page (Lightning Page) is the one showing the latest implementation approach. It consists of two LWC components added to the page - lightAvailableProducts and lightOrderProducts. It may need to be activated properly (i.e. assigned as org default) in order to see it for Orders.

# Acceptance Criteria

## 1. The solution is available as a repository on GitHub/Bitbucket etc

Well... it is indeed...

## 2. The "Available Products" component displays orderable products in a 2-column list displaying Name and List Price

Implemented in lightAvailableProducts LWC and AvailableProductsController Apex class.
- Products added to the order as Order Item are always showing on the top of the list. They are sorted alphabetically. Products available but not ordered are presented below, also according to alphabetical sorting.
- The list relies on price book entries which are unique within given price book (no multiple entries for the same product and price book are allowed). Therefore no duplicate products may appear on the list. The price book is read from the Order.
- Ascending and descending sorting is implemented on Product Name column.
- Searching by product name currently not implemented.

## 3. The "Available Products" component has to provide the ability for the user to add a product from the list to the order

Implemented in lightOrderProducts LWC, OrderProductsController Apex class and productAddedToOrder message channel. Leverages LDS to save the record.
- The lightAvailableProducts LWC sends a message to lightOrderProducts LWC when user clicks on the (+) button in a row representing a product to be added to the order.
- When product is not present on the order, a new OrderItem (Order Products) record is created, i.e. a new product is added to the order with quantity of one.
- When product has already been present on the order, its quantity is increased by one.

## 4. "Order Products" component has to display the order products in a table displaying the Name, Unit Price, Quantity and Total Price

Implemented in lightOrderProduct LWC and OrderProductsController Apex class.
- The list of ordered products refreshes automatically as soon as a new or existing product is added to the order. In the first situation, a new product appears on the list and is automatically sorted by the name according to current order (asc vs desc). In the second case, increased quantity of existing product is displayed in the table. No full page refresh is required.
- Ascending and descending sorting is implemented on Product Name column.

## 5. "Order Products" component has an "Activate" button that sets the status of the order and order items to "Activated"

Implemented in lightOrderProduct LWC and OrderProductsController, OrderItemTriggerHandler Apex classes. Leverages LDS to update status on the order.
- When (Activate) button is clicked, following changes are applied: 1) Order status is moved to Activated, 2) The (Activate) button deactivates (becomes grayed out) and cannot be clicked again, 3) (+) buttons in the Available Products components deactivate (become grayed out) and cannot be used to add more products to the order.
- When order is activated, additional safe guards has been implemented in code which prevent order products to be added or modified.

## 6. Test coverage

- AvailableProductsController - 100% of coverage
- OrderItemTrigger - 100% of coverage
- OrderItemTriggerHandler - 93% of coverage
- OrderProductsController - 100% of coverage
- Overall - 95% of coverage

# Extra Acceptance Criteria

## 1. Components should be independent

Solution implemented as two independent LWC which can be placed anywhere on the Lighthing Record Page. They are not using parent-child hierarchy to exchange information.
- The Order Lightning Record Page does not have to be refreshed to reflect changes on the components - 1) addition of a product to the order is automatically presented on the component (either as a new product or increased quantity of existing product), 2) change of order status disables ability to activate the order again (Activate button on lightOrderProducts LWC becomes disabled) and ability to add more products to the order (+ button on lightAvailableProducts LWC becomes disabled).

# Further considerations and possible enhancements
- The productsOrdered message channel is currently used even in a situation when no new product is added to the order (that's the case when quantity is increased). This is not necessary since the list of ordered products which is sent using the channel does not change. It might have some impact on performance when significant number of products is added to single order.
- Testing of LWC could use Jest framework to ensure proper quality by preparing JavaScript based unit tests for components.
- OrderItemTriggerHandler currently doesn't block deletion of Order Products when Order is Activated. This operation looks blocked from standard UI but might be available through API. If required, trigger could be extended to cover such cases.
- When there are no records for available products or order products, a relevant note may be appearing instead of or right below the data table to explain why the data is missing.
- ...


# Salesforce DX Project: Next Steps

Now that you’ve created a Salesforce DX project, what’s next? Here are some documentation resources to get you started.

## How Do You Plan to Deploy Your Changes?

Do you want to deploy a set of changes, or create a self-contained application? Choose a [development model](https://developer.salesforce.com/tools/vscode/en/user-guide/development-models).

## Configure Your Salesforce DX Project

The `sfdx-project.json` file contains useful configuration information for your project. See [Salesforce DX Project Configuration](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_ws_config.htm) in the _Salesforce DX Developer Guide_ for details about this file.

## Read All About It

- [Salesforce Extensions Documentation](https://developer.salesforce.com/tools/vscode/)
- [Salesforce CLI Setup Guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_intro.htm)
- [Salesforce DX Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_intro.htm)
- [Salesforce CLI Command Reference](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_reference.meta/sfdx_cli_reference/cli_reference.htm)
