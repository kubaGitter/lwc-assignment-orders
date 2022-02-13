@isTest 
public with sharing class OrderProductsControllerTest {
    
    static final string TEST_PB_NAME = 'Test Price Book';
    static final string TEST_ACC1_NAME = 'Test Account 1';
    static final string TEST_ACC2_NAME = 'Test Account 2';

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

        Account acc1 = new Account(
            Name = TEST_ACC1_NAME
        );
        insert acc1;

        Account acc2 = new Account(
            Name = TEST_ACC2_NAME
        );
        insert acc2;

        Contract c1 = new Contract(
            AccountId = acc1.Id,
            StartDate = Date.today() - 14,
            ContractTerm = 24,
            Pricebook2Id = pb.Id
        );
        insert c1;
        c1.Status = 'Activated';
        update c1;

        Contract c2 = new Contract(
            AccountId = acc2.Id,
            StartDate = Date.today() - 14,
            ContractTerm = 24,
            Pricebook2Id = pb.Id
        );
        insert c2;
        c2.Status = 'Activated';
        update c2;
  
        Order o1 = new Order(
            AccountId = acc1.Id,
            Pricebook2Id = pb.Id,
            EffectiveDate = Date.today(),
            ContractId = c1.Id,
            Status = 'Draft'
        );
        insert o1;

        Order o2 = new Order(
            AccountId = acc2.Id,
            Pricebook2Id = pb.Id,
            EffectiveDate = Date.today(),
            ContractId = c2.Id,
            Status = 'Draft'
        );
        insert o2;
        
        List<OrderItem> lstOIs = new List<OrderItem>();
        OrderItem oi1A = new OrderItem(
            OrderId = o1.Id,
            PricebookEntryId = pbeA.Id,
            Quantity = 5,
            UnitPrice = 100
        );
        lstOIs.add(oi1A);
        OrderItem oi1B = new OrderItem(
            OrderId = o1.Id,
            PricebookEntryId = pbeB.Id,
            Quantity = 5,
            UnitPrice = 100
        );
        lstOIs.add(oi1B);
        OrderItem oi2A = new OrderItem(
            OrderId = o2.Id,
            PricebookEntryId = pbeA.Id,
            Quantity = 5,
            UnitPrice = 100
        );
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
        lstOI1 = OrderProductsController.getOrderProducts(o2Id);
        Test.stopTest();

        System.assertEquals(2, lstOI1.size(), 'There should be 2 order items for order for \'TEST_ACC1_NAME\'');
        System.assertEquals(1, lstOI2.size(), 'There should be 1 order item for order for \'TEST_ACC2_NAME\'');

    }

}
