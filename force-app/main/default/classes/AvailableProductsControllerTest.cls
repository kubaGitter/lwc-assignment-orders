@isTest 
public with sharing class AvailableProductsControllerTest {
    
    static final string TEST_PB1_NAME = 'Test Price Book 1';
    static final string TEST_PB2_NAME = 'Test Price Book 2';

    @TestSetup
    static void makeData(){

        Id stdPbId = Test.getStandardPricebookId();

        Pricebook2 pb1 = new Pricebook2(
            Name = TEST_PB1_NAME,
            IsActive = true
        );
        insert pb1;
        
        Pricebook2 pb2 = new Pricebook2(
            Name = TEST_PB2_NAME,
            IsActive = true
        );
        insert pb2;

        Product2 prodA = new Product2(
            Name = 'Test Product A',
            ProductCode = 'PROD_A_TST',
            IsActive = true
        );
        insert prodA;

        Product2 prodB = new Product2(
            Name = 'Test Product B',
            ProductCode = 'PROD_B_TST',
            IsActive = true
        );
        insert prodB;
        
        PricebookEntry stdPbeA = new PricebookEntry(
            Pricebook2Id = stdPbId,
            Product2Id = prodA.Id,
            UnitPrice = 100
        );
        insert stdPbeA;
        
        PricebookEntry pbeA1 = new PricebookEntry(
            Pricebook2Id = pb1.Id,
            Product2Id = prodA.Id,
            UnitPrice = 100
        );
        insert pbeA1;
        
        PricebookEntry pbeA2 = new PricebookEntry(
            Pricebook2Id = pb2.Id,
            Product2Id = prodA.Id,
            UnitPrice = 100
        );
        insert pbeA2;

        PricebookEntry stdPbeB = new PricebookEntry(
            Pricebook2Id = stdPbId,
            Product2Id = prodB.Id,
            UnitPrice = 200
        );
        insert stdPbeB;
            
        PricebookEntry pbeB1 = new PricebookEntry(
            Pricebook2Id = pb1.Id,
            Product2Id = prodB.Id,
            UnitPrice = 200
        );
        insert pbeB1;
    }

    // Test case to verify that only products belonging to given price book are returned.
    // In @TestSetup the Product A was added to two test pricebooks. Product B is only in one.
    @isTest static void returnProductsFromThePricebookOnly() {

        List<PricebookEntry> lstPbes1 = new List<PricebookEntry>();
        List<PricebookEntry> lstPbes2 = new List<PricebookEntry>();

        Id pb1Id = [SELECT Id FROM Pricebook2 WHERE Name = :TEST_PB1_NAME].Id;
        Id pb2Id = [SELECT Id FROM Pricebook2 WHERE Name = :TEST_PB2_NAME].Id;

        Test.startTest();
        lstPbes1 = AvailableProductsController.getAvailableProducts(pb1Id);
        lstPbes2 = AvailableProductsController.getAvailableProducts(pb2Id);
        Test.stopTest();

        System.assertEquals(2, lstPbes1.size(), 'There should be 2 price book entries for price book \'TEST_PB1_NAME\'');
        System.assertEquals(1, lstPbes2.size(), 'There should be 2 price book entries for price book \'TEST_PB2_NAME\'');

    }

}
