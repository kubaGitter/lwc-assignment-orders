@isTest
private with sharing class OrderItemTriggerHandlerTest {

    public OrderItemTriggerHandlerTest() {
    }

    @TestSetup
    static void makeData(){

        Id stdPbId = Test.getStandardPricebookId();

        Pricebook2 pb = new Pricebook2(
            Name = 'Test Price Book',
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






}
