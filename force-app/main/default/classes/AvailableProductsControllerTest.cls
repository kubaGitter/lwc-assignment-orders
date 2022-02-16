@isTest 
public with sharing class AvailableProductsControllerTest {
    
    static final string TEST_PB1_NAME = 'Test Price Book 1';
    static final string TEST_PB2_NAME = 'Test Price Book 2';
    static final string TEST_PROD1_CODE = 'Test Product 1';
    static final string TEST_PROD2_CODE = 'Test Product 2';

    @TestSetup
    static void makeData(){

        Id stdPbId = Test.getStandardPricebookId();
        Id tstPb1Id = TestDataFactory.createPriceBook(TEST_PB1_NAME);
        Id tstPb2Id = TestDataFactory.createPriceBook(TEST_PB2_NAME);
        Product2 prodA = TestDataFactory.createProduct('Test Product A', TEST_PROD1_CODE);
        Product2 prodB = TestDataFactory.createProduct('Test Product B', TEST_PROD2_CODE);
        PricebookEntry stdPbeA = TestDataFactory.createPricebookEntry(stdPbId, prodA.Id, 100);
        PricebookEntry tstPbeA1 = TestDataFactory.createPricebookEntry(tstPb1Id, prodA.Id, 100);
        PricebookEntry tstPbeA2 = TestDataFactory.createPricebookEntry(tstPb2Id, prodA.Id, 100);
        PricebookEntry stdPbeB = TestDataFactory.createPricebookEntry(stdPbId, prodB.Id, 200);
        PricebookEntry tstPbeB1 = TestDataFactory.createPricebookEntry(tstPb1Id, prodB.Id, 200);
        
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
