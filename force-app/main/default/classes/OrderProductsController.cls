public with sharing class OrderProductsController {
    public OrderProductsController() {

    }

    @AuraEnabled(cacheable=true)
    public static List<OrderItem> getOrderProducts(Id orderId) {
        return [SELECT Id, PricebookEntryId, Product2.Name, Quantity, UnitPrice, TotalPrice FROM OrderItem WHERE OrderId = :orderId];
    }

    @AuraEnabled(cacheable=false)
    public static void activateOrder(Id orderId){
        try {
            Order o = [SELECT Id, Status FROM Order WHERE Id = :orderId];
            o.Status = 'Activated';
            update o;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
}
