@isTest
private with sharing class OrderItemTriggerHandlerTest {

    public OrderItemTriggerHandlerTest() {
    }

    static final string TEST_PB_NAME = 'Test Price Book';

    @TestSetup
    static void makeData(){

        Id stdPbId = Test.getStandardPricebookId();

        Pricebook2 pb = new Pricebook2(
            Name = TEST_PB_NAME,
            IsActive = true
        );
        insert pb;

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
        
        PricebookEntry pbeA = new PricebookEntry(
            Pricebook2Id = pb.Id,
            Product2Id = prodA.Id,
            UnitPrice = 100
        );
        insert pbeA;

        PricebookEntry stdPbeB = new PricebookEntry(
            Pricebook2Id = stdPbId,
            Product2Id = prodB.Id,
            UnitPrice = 200
        );
        insert stdPbeB;
            
        PricebookEntry pbeB = new PricebookEntry(
            Pricebook2Id = pb.Id,
            Product2Id = prodB.Id,
            UnitPrice = 200
        );
        insert pbeB;
            
        Account acc = new Account(
            Name = 'TestAccount'
        );
        insert acc;

        Contract c = new Contract(
            AccountId = acc.Id,
            StartDate = Date.today() - 14,
            ContractTerm = 24,
            Pricebook2Id = pb.Id
        );
        insert c;
        c.Status = 'Activated';
        update c;
  
        List<Order> lstOrders = new List<Order>();
        for (Integer i=0; i<100; i++) {
            Order o = new Order(
                AccountId = acc.Id,
                Pricebook2Id = pb.Id,
                EffectiveDate = Date.today(),
                ContractId = c.Id,
                Status = 'Draft'
            );
            lstOrders.add(o);
        }
        insert lstOrders;

        List<OrderItem> lstOrderItems = new List<OrderItem>();
        for (Integer i=0; i<lstOrders.size(); i++) {
            Order o = lstOrders[i];
            OrderItem oi = new OrderItem(
                OrderId = o.Id,
                PricebookEntryId = pbeA.Id,
                Quantity = 5,
                UnitPrice = 100
                );
            lstOrderItems.add(oi);
        }
        insert lstOrderItems;
        
        
    }
    
    // Test method checking if validation fails on Order Item insert when related Order is activated.
    // @TestSetup method added only ProdA to test Order. Now I'm trying to add ProdB.
    // This should be blocked by Order.Status related validation.
    @isTest
    public static void addNewItemToActivatedOrder() {

        // Activate one test Order.
        Order o = getTestOrder();
        o.Status = 'Activated';
        update o;

        OrderItem oi = createTestOrderItem(o, 'PROD_B_TST');

        Test.startTest();
        try {
            insert oi;
        }
        catch (DmlException de) {
            // Test if the exception was thrown as expected.
            System.assert(de.getMessage().contains(Constants.ERRMSG_ORDERITEM_ACTIVATEDORDER), 'Insert should fail due to parent order being activated.');
        }
        Test.stopTest();

        // Test if insert was prevented and there's still only one Order Item.
        System.assertEquals(1, getNumberOfOrderItems(o), 'Insert succeeded while it should fail due to related Order being Activated.');
    }

    // Test method checks if adding a new (not existing) Order Item to the Order works, i.e. allows to add an item.
    // @TestSetup method added only ProdA to test Order. Now I'm trying to add ProdB.
    // This should execute successfully.
    @isTest
    public static void addNewItemToDraftOrder() {

        Order o = getTestOrder();
        OrderItem oi = createTestOrderItem(o, 'PROD_B_TST');

        Test.startTest();
        try {
            insert oi;
        }
        catch (DmlException de) {
            // Test if the exception was thrown while this time it should succeed.
            System.assert(false, 'Insert should succeed but failed due to: ' +de.getMessage());
        }
        Test.stopTest();

        // Test if insert was successful and there're two Order Items now.
        System.assertEquals(2, getNumberOfOrderItems(o), 'Insert seemed to succeed but the new Order Item is not created.');
        
    }

    // Test method checks if validation prevents adding an Order Item for a product which is already ordered.
    // @TestSetup method added ProdA to test Order. Now I'm trying to add ProdA again.
    // This should be blocked by duplicate-related validation.
    @isTest
    public static void addDuplicateItemToDraftOrder() {
        Order o = getTestOrder();
        OrderItem oi = createTestOrderItem(o, 'PROD_A_TST');

        Test.startTest();
        try {
            insert oi;
        }
        catch (DmlException de) {
            // Test if the exception was thrown as expected.
            System.assert(de.getMessage().contains(Constants.ERRMSG_ORDERITEM_DUPLICATEITEM), 'Insert should fail due to duplicate product being added to the Order.');
        }
        Test.stopTest();

        // Test if insert was prevented and there's still only one Order Item.
        System.assertEquals(1, getNumberOfOrderItems(o), 'Insert succeeded while it should fail due to duplicate Order Item being added.');
    }


    // Test method checks if validation prevents modification of an Order Item on Order which was activated.
    // This should be blocked by Order.Status-related validation.
    @isTest
    public static void modifyItemOnActivatedOrder() {

        Order o = getTestOrder();
        o.Status = 'Activated';
        update o;

        OrderItem oi = getTestOrderItem(o);
        oi.Quantity = 99;

        Test.startTest();
        try {
            update oi;
        }
        catch (DmlException de) {
            // Test if the exception was thrown as expected.
            System.assert(de.getMessage().contains(Constants.ERRMSG_ORDERITEM_ACTIVATEDORDER), 'Update should fail due to parent order being activated.');
        }
        Test.stopTest();

        // Test if quantity has not been modified. Need to re-query from database to see if the value actually persisted.
        OrderItem oi2 = [SELECT Id, Quantity FROM OrderItem WHERE Id = :oi.Id];
        System.assertNotEquals(99, oi2.Quantity, 'Update succeeded while it should fail due to parent order being activated.');
        
    }


    // Test method checks if modification of an Order Item on draft Order is allowed.
    @isTest
    public static void modifyItemOnDraftOrder() {

        Order o = getTestOrder();
        OrderItem oi = getTestOrderItem(o);
        oi.Quantity = 99;

        Test.startTest();
        try {
            update oi;
        }
        catch (DmlException de) {
            // Test if no exception was thrown.
            System.assert(false, 'Update should succeed but failed due to: ' +de.getMessage());
        }
        Test.stopTest();

        // Test if quantity has been modified. Need to re-query from database to see if the value actually persisted.
        OrderItem oi2 = [SELECT Id, Quantity FROM OrderItem WHERE Id = :oi.Id];
        System.assertEquals(99, oi2.Quantity, 'Update succeeded but the quantity has not been modified.');

    }



    /* HELPER METHODS */

    // Helper method which returns an Order to be used in testing.
    private static Order getTestOrder() {
        return [SELECT Id, Status FROM Order LIMIT 1];
    }

    // Helper method to produce a Product Code by Pricebook Entry Id map used in testing to simplify adding proper products to test Orders.
    private static Map<String, Id> getProdCodeByPbeIdMap() {

        Id testPb = [SELECT Id FROM Pricebook2 WHERE Name = :TEST_PB_NAME].Id;
        
        List<PricebookEntry> lstPbes = [SELECT Id, Product2.ProductCode FROM PricebookEntry WHERE Pricebook2Id = :testPb];
        Map<String, Id> mapProdCodeByPbeId = new Map<String, Id>();
        for (PricebookEntry pbe : lstPbes) {
            mapProdCodeByPbeId.put(pbe.Product2.ProductCode, pbe.Id);
        }
        
        return mapProdCodeByPbeId;

    }

    // Helper method to get existing test Order Item.
    private static OrderItem getTestOrderItem(Order o) {
        return [SELECT Id, Quantity FROM OrderItem LIMIT 1];
    }

    // Helper method to create a test Order Item.
    private static OrderItem createTestOrderItem(Order o, String productCode) {

        Map<String, Id> mapProdCodeByPbeId = getProdCodeByPbeIdMap();

        OrderItem oi = new OrderItem(
            OrderId = o.Id,
            PricebookEntryId = mapProdCodeByPbeId.get(productCode),
            Quantity = 5,
            UnitPrice = 100
        );
        return oi;
    }

    // Helper method to check number of Order Items for the Order.
    private static Integer getNumberOfOrderItems(Order o) {
        List<OrderItem> lstOIs = [SELECT Id FROM OrderItem WHERE OrderId = :o.Id];
        return lstOIs.size();
    }

}
