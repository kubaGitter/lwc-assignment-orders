trigger OrderItemTrigger on OrderItem (before insert, before update) {

    switch on Trigger.operationType {
        when BEFORE_INSERT {
            OrderItemTriggerHandler.onBeforeInsert(Trigger.old, Trigger.new);
        }
        when BEFORE_UPDATE {
            OrderItemTriggerHandler.onBeforeUpdate(Trigger.old, Trigger.new);
        }
        when else {
            // If we'd need anything common between other operations, currently not used, the clause could be removed.
        }
    } 

}