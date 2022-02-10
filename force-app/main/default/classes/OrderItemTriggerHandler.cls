public with sharing class OrderItemTriggerHandler {

    public OrderItemTriggerHandler() {

    }

    public static void onBeforeInsert(List<OrderItem> oldOIs, List<OrderItem> newOIs) {
        //validate...
    }

    public static void onBeforeUpdate(List<OrderItem> oldOIs, List<OrderItem> newOIs) {
        // Instead of SOQL below, a formula could be used to bring status of Order to the OrderItem level.
        // Therefore we could save a query if needed.
        // In this case however I'll implement fully in code as per requirement.

        // Collect all Order Ids which are processed in this bulk
        Set<Id> orderIds = new Set<Id>();
        for (OrderItem oi : newOIs) {
            orderIds.add(oi.OrderId);
        }

        // Query Status Category of all Orders related to processed Order Items.
        // I use Status Category instead of Status in case there's more custom statuses indicating activation.
        // The query retrieves only Orders which are interesting in this case.
        // Since we want to block changes on Activated Orders, I'm retrieving only relevant records.
        // Query could be moved to a data selector class if exists.
        Set<Id> activatedOrders = new Map<Id, Order>([SELECT Id FROM Order WHERE Id IN :orderIds AND StatusCode = 'Activated']).keySet();
        for (OrderItem oi : newOIs) {
            // If Order related to currently processed OrderItem is present in the set it means it's Activated and operation should be blocked.
            if(activatedOrders.contains(oi.OrderId)) {
                // Validation error added on a OI record related to activated Order.
                oi.addError('The order is already activated, no changes are allowed.');
            }
        }
    }

    private static void validateChange(List<OrderItem> oldOIs, List<OrderItem> newOIs) {
        // Validation logic can be put here in one place and shared between insert and update.
    }

}
