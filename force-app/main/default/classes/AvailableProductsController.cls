public with sharing class AvailableProductsController {
    
    @AuraEnabled(cacheable=true)
    public static List<PricebookEntry> getAvailableProducts(Id pricebookId) {
        System.debug('controller - pbId: ' +pricebookId);
        List<PricebookEntry> pbes = [SELECT Id, Product2Id, Product2.Name, UnitPrice FROM PricebookEntry WHERE Pricebook2Id = :pricebookId];
        System.debug('controller - # pbes retured: ' +pbes.size());
        return pbes;
    }

    @AuraEnabled(cacheable=false)
    public static void addProductToOrder(Id orderId, Id pbeId, Double unitPrice) {
        System.debug('addProductToOrder, orderId: ' +orderId+ ', pbeId: ' +pbeId+ ', unitPrice: ' +unitPrice);
        /*
        OrderItem oi = new OrderItem();
        oi.OrderId = orderId;
        oi.PricebookEntryId = pbeId;
        oi.Quantity = 1;
        oi.UnitPrice = UnitPrice;
        insert oi;
        */

        List<OrderItem> lstOI = [SELECT Id, PricebookEntryId, Quantity FROM OrderItem WHERE OrderId = :orderId AND PricebookEntryId = :pbeId];

        if (lstOI.size() == 0) {
            // Since no OrderItems for this product on the order let's create a new one with quantity of 1.
            OrderItem oi = new OrderItem();
            oi.OrderId = orderId;
            oi.PricebookEntryId = pbeId;
            oi.Quantity = 1;
            oi.UnitPrice = unitPrice;
            insert oi;
        }
        else if (lstOI.size() == 1) {
            // There's already this product on the order, let's increase the quantity by 1.
            lstOI.get(0).Quantity += 1;
            update lstOI;
        }
        else {
            // We have a problem, somehow the product has more than 1 OrderItem record on the order. 
            // That would need to be handled somehow or prevented. For now I'm skipping such a case.
            System.debug('Warning - the product has more than one OrderItem record on the Order, it\'s ignored.');
        }

    }

}

    
