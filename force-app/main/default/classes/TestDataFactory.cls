@isTest
public class TestDataFactory {

    public static Id createPriceBook(String pbName) {
        Pricebook2 pb = new Pricebook2(
            Name = pbName,
            IsActive = true
        );
        insert pb;
        return pb.Id;
    }

    public static Product2 createProduct(String prodName, String prodCode) {
        Product2 prod = new Product2(
            Name = prodName,
            ProductCode = prodCode,
            IsActive = true
        );
        insert prod;
        return prod;
    }

    public static PricebookEntry createPricebookEntry(Id pbId, Id prodId, Double unitPrice) {
        PricebookEntry pbe = new PricebookEntry(
            Pricebook2Id = pbId,
            Product2Id = prodId,
            UnitPrice = unitPrice
        );
        insert pbe;
        return pbe;
    }

    public static Account createAccount(String accName) {
        Account acc = new Account(
            Name = accName
        );
        insert acc;
        return acc;
    }

    public static Contract createActiveContract(Id accId, Id pbId) {
        Contract c = new Contract(
            AccountId = accId,
            StartDate = Date.today() - 14,
            ContractTerm = 24,
            Pricebook2Id = pbId
        );
        insert c;
        c.Status = 'Activated';
        update c;
        return c;
    }

    public static Order createOrder(Id accId, Id pbId, Id contractId, String status) {
        Order o = new Order(
            AccountId = accId,
            Pricebook2Id = pbId,
            EffectiveDate = Date.today(),
            ContractId = contractId,
            Status = status
        );
        insert o;
        return o;
    }

    public static OrderItem prepareOrderItem(Id orderId, Id pbeId, Integer quantity, Double unitPrice) {
        OrderItem oi = new OrderItem(
            OrderId = orderId,
            PricebookEntryId = pbeId,
            Quantity = quantity,
            UnitPrice = unitPrice
        );
        return oi;
    }

}