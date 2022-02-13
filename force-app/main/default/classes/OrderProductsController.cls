public with sharing class OrderProductsController {

    @AuraEnabled(cacheable=true)
    public static List<OrderItem> getOrderProducts(Id orderId) {
        return [SELECT Id, PricebookEntryId, Product2.Name, Quantity, UnitPrice, TotalPrice FROM OrderItem WHERE OrderId = :orderId];
    }

}
