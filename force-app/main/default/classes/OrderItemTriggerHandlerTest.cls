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
            System.debug('OI#' +i+ ': ' +JSON.serialize(oi));
            lstOrderItems.add(oi);
        }
        insert lstOrderItems;
        
        
    }
    
    @isTest
    public static void testParentOrderStatusValidation() {

    }

    @isTest
    public static void testDuplicateValidation() {

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

        Map<String, Id> mapProdCodeByPbeId = getProdCodeByPbeIdMap();

        OrderItem oi = new OrderItem(
            OrderId = o.Id,
            PricebookEntryId = mapProdCodeByPbeId.get('PROD_B_TST'),
            Quantity = 5,
            UnitPrice = 100
        );            

        Test.startTest();
        try {
            insert oi;
        }
        catch (DmlException de) {
            System.assert(de.getMessage().contains(Constants.ERRMSG_ORDERITEM_ACTIVATEDORDER), 'Insert should fail due to parent order being activated.');
        }
        Test.stopTest();
    }

    // Test method checks if adding a new (not existing) Order Item to the Order works, i.e. allows to add an item.
    // @TestSetup method added only ProdA to test Order. Now I'm trying to add ProdB.
    // This should execute successfully.
    @isTest
    public static void addNewItemToDraftOrder() {

        Order o = getTestOrder();
        Map<String, Id> mapProdCodeByPbeId = getProdCodeByPbeIdMap();

        OrderItem oi = new OrderItem(
            OrderId = o.Id,
            PricebookEntryId = mapProdCodeByPbeId.get('PROD_B_TST'),
            Quantity = 5,
            UnitPrice = 100
        );            

        Test.startTest();
        try {
            insert oi;
        }
        catch (DmlException de) {
            System.assert(false, 'Insert should succeed but failed due to: ' +de.getMessage());
        }
        Test.stopTest();
        
    }


    @isTest
    public static void addDuplicateItemToDraftOrder() {
        
    }


    @isTest
    public static void modifyItemOnActivatedOrder() {
        
    }

    @isTest
    public static void modifyItemOnDraftOrder() {
        
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

}
