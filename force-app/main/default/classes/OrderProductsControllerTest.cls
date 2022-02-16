@isTest 
public with sharing class OrderProductsControllerTest {
    
    static final string TEST_PB_NAME = 'Test Price Book';
    static final string TEST_ACC1_NAME = 'Test Account 1';
    static final string TEST_ACC2_NAME = 'Test Account 2';
    static final string TEST_PROD1_CODE = 'Test Product 1';
    static final string TEST_PROD2_CODE = 'Test Product 2';

    @TestSetup
    static void makeData(){

        Id stdPbId = Test.getStandardPricebookId();
        Id tstPbId = TestDataFactory.createPriceBook(TEST_PB_NAME);
        Product2 prodA = TestDataFactory.createProduct('Test Product A', TEST_PROD1_CODE);
        Product2 prodB = TestDataFactory.createProduct('Test Product B', TEST_PROD2_CODE);
        PricebookEntry stdPbeA = TestDataFactory.createPricebookEntry(stdPbId, prodA.Id, 100);
        PricebookEntry tstPbeA = TestDataFactory.createPricebookEntry(tstPbId, prodA.Id, 100);
        PricebookEntry stdPbeB = TestDataFactory.createPricebookEntry(stdPbId, prodB.Id, 200);
        PricebookEntry tstPbeB = TestDataFactory.createPricebookEntry(tstPbId, prodB.Id, 200);
        Account acc1 = TestDataFactory.createAccount(TEST_ACC1_NAME);
        Account acc2 = TestDataFactory.createAccount(TEST_ACC2_NAME);
        Contract c1 = TestDataFactory.createActiveContract(acc1.Id, tstPbId);
        Contract c2 = TestDataFactory.createActiveContract(acc2.Id, tstPbId);
        Order o1 = TestDataFactory.createOrder(acc1.Id, tstPbId, c1.Id, 'Draft');
        Order o2 = TestDataFactory.createOrder(acc2.Id, tstPbId, c2.Id, 'Draft');
        
        List<OrderItem> lstOIs = new List<OrderItem>();

        OrderItem oi1A = TestDataFactory.prepareOrderItem(o1.Id, tstPbeA.Id, 5, 100);
        lstOIs.add(oi1A);
        OrderItem oi1B = TestDataFactory.prepareOrderItem(o1.Id, tstPbeB.Id, 5, 100);
        lstOIs.add(oi1B);
        OrderItem oi2A = TestDataFactory.prepareOrderItem(o2.Id, tstPbeA.Id, 5, 100);
        lstOIs.add(oi2A);
        insert lstOIs;

    }

    // Test case to verify that only products belonging to given order are returned.
    // In @TestSetup two orders were created. First has two order items, the second has one item..
    @isTest static void returnProductsFromTheOrderOnly() {

        List<OrderItem> lstOI1 = new List<OrderItem>();
        List<OrderItem> lstOI2 = new List<OrderItem>();

        Id o1Id = [SELECT Id FROM Order WHERE Account.Name = :TEST_ACC1_NAME].Id;
        Id o2Id = [SELECT Id FROM Order WHERE Account.Name = :TEST_ACC2_NAME].Id;

        Test.startTest();
        lstOI1 = OrderProductsController.getOrderProducts(o1Id);
        lstOI2 = OrderProductsController.getOrderProducts(o2Id);
        Test.stopTest();

        System.assertEquals(2, lstOI1.size(), 'There should be 2 order items for order for \'TEST_ACC1_NAME\'');
        System.assertEquals(1, lstOI2.size(), 'There should be 1 order item for order for \'TEST_ACC2_NAME\'');

    }

}
