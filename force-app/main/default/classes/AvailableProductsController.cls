public with sharing class AvailableProductsController {
    
    @AuraEnabled(cacheable=true)
    public static List<PricebookEntry> getAvailableProducts(Id pricebookId) {
        List<PricebookEntry> pbes = [SELECT Id, Product2Id, Product2.Name, UnitPrice FROM PricebookEntry WHERE Pricebook2Id = :pricebookId];
        return pbes;
    }

}

    
