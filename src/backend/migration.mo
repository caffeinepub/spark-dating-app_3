import Map "mo:core/Map";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";

module {
  type OldMessage = {
    from : Principal;
    to : Principal;
    content : Text;
    timestamp : Int;
    isRead : Bool;
  };

  type OldActor = {
    messages : Map.Map<Principal, List.List<OldMessage>>;
  };

  type NewMessage = {
    from : Principal;
    to : Principal;
    content : Text;
    timestamp : Int;
    isRead : Bool;
    isDeletedForEveryone : Bool;
  };

  type NewActor = {
    messages : Map.Map<Principal, List.List<NewMessage>>;
  };

  public func run(old : OldActor) : NewActor {
    var newMessages = Map.empty<Principal, List.List<NewMessage>>();

    switch (old.messages) {
      case (existing) {
        newMessages := existing.map<Principal, List.List<OldMessage>, List.List<NewMessage>>(
          func(_k, oldList) {
            oldList.map<OldMessage, NewMessage>(
              func(oldMsg) {
                {
                  oldMsg with
                  isDeletedForEveryone = false;
                };
              }
            );
          }
        );
      };
    };

    { messages = newMessages };
  };
};
