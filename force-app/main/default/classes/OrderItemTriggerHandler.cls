public with sharing class OrderItemTriggerHandler {

    public OrderItemTriggerHandler() {
    }


    public static void onBeforeInsert(List<OrderItem> oldOIs, List<OrderItem> newOIs) {
        validateParentOrderStatus(oldOIs, newOIs);
        validateDuplicates(oldOIs, newOIs);
    }


    public static void onBeforeUpdate(List<OrderItem> oldOIs, List<OrderItem> newOIs) {
        // The validation logic for update should be different than for insert.
        // The PricebookEntryId field is not writtable, i.e. once Order Item is created it cannot be changed.
        // Therefore, there's no need to check for duplicates in a situation when existing records are being updated (update trigger operation).
        validateParentOrderStatus(oldOIs, newOIs);
    }


    private static void validateParentOrderStatus(List<OrderItem> oldOIs, List<OrderItem> newOIs) {
        // Instead of SOQL below, a formula could be used to bring status of Order to the OrderItem level.
        // Therefore we could save a query if needed.
        // In this case however I'll implement fully in code as per requirement.

        // Collect all Order Ids which are processed in this bulk 
        Set<Id> orderIds = getParentOrderIds(newOIs);

        // Query Status Category of all Orders related to processed Order Items.
        // I use Status Category instead of Status in case there's more custom statuses indicating activation.
        // The query retrieves only Orders which are interesting in this case.
        // Since we want to block changes on Activated Orders, I'm retrieving only relevant records.
        // Query could be moved to a data selector class if exists.
        Set<Id> activatedOrders = new Map<Id, Order>([SELECT Id FROM Order WHERE Id IN :orderIds AND StatusCode = 'Activated']).keySet();
        // If there's no activated Orders then there's nothing to validate.
        if (activatedOrders.isEmpty()) return;

        for (OrderItem oi : newOIs) {
            // If Order related to currently processed OrderItem is present in the set it means it's Activated and operation should be blocked.
            if(activatedOrders.contains(oi.OrderId)) {
                // Validation error added on a OI record related to activated Order.
                oi.addError(Constants.ERRMSG_ORDERITEM_ACTIVATEDORDER);
            }
        }
    }


    private static void validateDuplicates(List<OrderItem> oldOIs, List<OrderItem> newOIs) {
        // Collect all Order Ids which are processed in this bulk 
        Set<Id> orderIds = getParentOrderIds(newOIs);

        // I build a map showing all products (PricebookEntries to be specific) on the Orders related to processed OrderItems.
        // First query some fields from OrderItems being processed.
        List<OrderItem> existingOIs = new List<OrderItem>([SELECT Id, OrderId, PricebookEntryId FROM OrderItem WHERE OrderId IN :orderIds]);
        // If there're no existing Order Items for any of Orders then there's nothing to validate.
        if (existingOIs.isEmpty()) return;

        // Then construct a map containing info on which Pricebook Entries are already added to which Orders
        Map<Id, List<Id>> mapOrderIdByExistingPbeId = new Map<Id, List<Id>>();
        for (OrderItem oi : existingOIs) {
            // If map already contains information for currently processed OrderId then add another PricebookEntryId which relates to Product on the Order.
            if (mapOrderIdByExistingPbeId.containsKey(oi.OrderId)) {
                mapOrderIdByExistingPbeId.get(oi.OrderId).add(oi.PricebookEntryId);
            }
            // If map doesn't contain info for current OrderId, create new list for that key.
            else {
                mapOrderIdByExistingPbeId.put(oi.OrderId, new List<Id> { oi.PricebookEntryId });
            }
        }

        // Having the map prepared, I can use it to search for potential duplicates in records passed to the trigger.
        for (OrderItem oi : newOIs) {
            if (mapOrderIdByExistingPbeId.get(oi.OrderId).contains(oi.PricebookEntryId)) {
                oi.addError(Constants.ERRMSG_ORDERITEM_DUPLICATEITEM);
            }
        }

    }


    private static Set<Id> getParentOrderIds(List<OrderItem> lstOIs) {
        // Helper method which is used by validation methods.
        // Collect all parent Order Ids for Order Items which are processed in this bulk.
        Set<Id> orderIds = new Set<Id>();
        for (OrderItem oi : lstOIs) {
            orderIds.add(oi.OrderId);
        }
        return orderIds;
    }

}
