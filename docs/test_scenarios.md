#Client-action scenarios

##Single Action Scenarios
1. Scenario: A 'Create' action in one client gets advertised to another passive client
2. Scenario: An 'Update' action in one client gets advertised to another passive client
3. Scenario: An 'Delete' action in one client gets advertised to another passive client
4. Scenario: A 'getUser' action in a client correctly returns that particular user's information
5. Scenario: A 'getAllUsers' action in a client returns the entire list of users

#Multiple Simultaneous Scenarios
1. Scenario: A simultaneous 'Update' and 'Delete' on same document by two clients results in they being applied in random order. The end result can either by a delete or an update.
2. Scenario: Multiple simultaneous 'Update's on same document by multiple different clients result in they being applied in random order.
3. Scenario: Multiple simultaneous 'Delete's on same document by multiple different clients result in successful deletion of the document and equivalent number of notifications being generated.

#Lock Scenarios
1. Scenario: Lock expiry event should get generated in order to service pending write requests on a document whose lock has been artificially held by an outside redis client.
2. Scenario: Long Poll Timer should fire up in order to service pending write request on a document because it fails to get lock del/expired events from the redis server and/or a new write request
from a client.
3. Scenario: Lock deletion event should get generated for servicing the pending write requests on a document, upon release of its artificially held lock ( without expiry) by an outside redis client.
4. Scenario: Simulate the creation of two different batches of write requests on a document. Note: At a given point of time, the server can have at most two batches of requests for a document, one being
actively getting serviced in a serial fashion, and the other being queued up.
