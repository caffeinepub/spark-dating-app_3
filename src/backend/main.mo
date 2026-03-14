import List "mo:core/List";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Int "mo:core/Int";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import AccessControl "authorization/access-control";

actor {
  // State
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  include MixinStorage();

  module UserProfile {
    public type Gender = {
      #male;
      #female;
      #other;
    };
    public type Id = Nat;

    public type Interest = {
      id : Nat;
      name : Text;
    };

    public type VisibleInterest = {};

    public type InterestDisplayPrefs = {
      showGender : Bool;
      showAge : Bool;
      showInterests : Bool;
      visibleInterests : [VisibleInterest];
      skipGender : Bool;
      genderPreference : Gender;
    };

    public type Profile = {
      id : Nat;
      principal : Principal;
      displayName : Text;
      lastActive : Int;
      photoLink : Text;
      isActive : Bool;
      gender : Gender;
      genderPreference : Gender;
      interests : [Interest];
    };
  };

  type Like = {
    from : Principal;
    to : Principal;
    timestamp : Int;
  };

  type Follow = {
    follower : Principal;
    following : Principal;
    timestamp : Int;
  };

  type Notification = {
    to : Principal;
    message : Text;
    timestamp : Int;
    isRead : Bool;
  };

  type Message = {
    from : Principal;
    to : Principal;
    content : Text;
    timestamp : Int;
    isRead : Bool;
  };

  // Comparison functions for sorting
  module Message {
    public func compareByTimestamp(a : Message, b : Message) : Order.Order {
      Int.compare(a.timestamp, b.timestamp);
    };
  };

  let profiles = Map.empty<Principal, UserProfile.Profile>();
  let likes = Map.empty<Principal, List.List<Like>>();
  let follows = Map.empty<Principal, List.List<Follow>>();
  let notifications = Map.empty<Principal, List.List<Notification>>();
  let messages = Map.empty<Principal, List.List<Message>>();
  let profilesInfo = Map.empty<Principal, UserProfile.InterestDisplayPrefs>();

  func isMatched(user1 : Principal, user2 : Principal) : Bool {
    switch (likes.get(user1)) {
      case (?user1Likes) {
        user1Likes.any(func(like) { like.to == user2 });
      };
      case (null) { false };
    };
  };

  func messagesForPair(user1 : Principal, user2 : Principal) : [Message] {
    let pairMessages = switch (messages.get(user1)) {
      case (?user1Messages) {
        user1Messages.filter(func(m) { m.to == user2 }).toArray();
      };
      case (null) { [] };
    };

    let combined = switch (messages.get(user2)) {
      case (?user2Messages) {
        let user2ToUser1 = user2Messages.filter(func(m) { m.to == user1 }).toArray();
        pairMessages.concat(user2ToUser1);
      };
      case (null) { pairMessages };
    };

    combined.sort(Message.compareByTimestamp);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async UserProfile.Profile {
    switch (profiles.get(user)) {
      case (null) { Runtime.trap("Profile does not exist") };
      case (?profile) { profile };
    };
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile.Profile) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };

    let fullProfile = {
      profile with
      principal = caller;
      lastActive = Time.now();
      isActive = true;
    };
    profiles.add(caller, fullProfile);
  };

  public shared ({ caller }) func saveCallerUserProfileInfo(profileInfo : UserProfile.InterestDisplayPrefs) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save profile info");
    };
    profilesInfo.add(caller, profileInfo);
  };

  public shared ({ caller }) func setOnline() : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can set online status");
    };
    switch (profiles.get(caller)) {
      case (null) { () };
      case (?profile) {
        profiles.add(caller, { profile with isActive = true });
      };
    };
  };

  public shared ({ caller }) func setOffline() : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can set offline status");
    };
    switch (profiles.get(caller)) {
      case (null) { () };
      case (?profile) {
        profiles.add(caller, { profile with isActive = false });
      };
    };
  };

  public shared ({ caller }) func likeUser(likedUserId : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can like profiles");
    };
    let newLike = {
      from = caller;
      to = likedUserId;
      timestamp = Time.now();
    };
    switch (likes.get(caller)) {
      case (null) {
        likes.add(caller, List.fromArray<Like>([newLike]));
      };
      case (?existing) {
        existing.add(newLike);
        likes.add(caller, existing);
      };
    };
    let notification = {
      to = likedUserId;
      message = "You have a new like!";
      timestamp = Time.now();
      isRead = false;
    };
    switch (notifications.get(likedUserId)) {
      case (null) {
        notifications.add(likedUserId, List.fromArray<Notification>([notification]));
      };
      case (?existing) {
        existing.add(notification);
        notifications.add(likedUserId, existing);
      };
    };
  };

  public shared ({ caller }) func unlikeUser(_unlikedUserId : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can unlike profiles");
    };
    likes.remove(caller);
  };

  public query ({ caller }) func getWhoLikedMe() : async [Principal] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view likes");
    };
    let result = List.empty<Principal>();
    for ((user, likeList) in likes.entries()) {
      likeList.forEach(func(like) {
        if (like.to == caller) {
          result.add(user);
        };
      });
    };
    result.toArray();
  };

  public query ({ caller }) func getWhoILiked() : async [Principal] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view likes");
    };
    switch (likes.get(caller)) {
      case (null) { [] };
      case (?likeList) {
        likeList.map<Like, Principal>(func(like) { like.to }).toArray();
      };
    };
  };

  public shared ({ caller }) func followUser(followedUserId : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can follow profiles");
    };
    let newFollow = {
      follower = caller;
      following = followedUserId;
      timestamp = Time.now();
    };
    switch (follows.get(caller)) {
      case (null) {
        follows.add(caller, List.fromArray<Follow>([newFollow]));
      };
      case (?existing) {
        existing.add(newFollow);
        follows.add(caller, existing);
      };
    };
  };

  public shared ({ caller }) func unfollowUser(unfollowedUserId : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can unfollow profiles");
    };
    switch (follows.get(caller)) {
      case (null) { () };
      case (?followingList) {
        let filtered = followingList.filter(func(f) { f.following != unfollowedUserId });
        follows.add(caller, filtered);
      };
    };
  };

  public query ({ caller }) func getFollowers() : async [Principal] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view followers");
    };
    let result = List.empty<Principal>();
    for ((user, followList) in follows.entries()) {
      followList.forEach(func(follow) {
        if (follow.following == caller) {
          result.add(user);
        };
      });
    };
    result.toArray();
  };

  public query ({ caller }) func getFollowing() : async [Principal] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view following");
    };
    switch (follows.get(caller)) {
      case (null) { [] };
      case (?followList) {
        followList.map<Follow, Principal>(func(follow) { follow.following }).toArray();
      };
    };
  };

  public shared ({ caller }) func sendMessage(recipient : Principal, content : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can send messages");
    };

    if (not isMatched(caller, recipient)) {
      Runtime.trap("Unauthorized: Can only message matched users");
    };

    let fullMessage = {
      from = caller;
      to = recipient;
      content;
      timestamp = Time.now();
      isRead = false;
    };

    let recipients = [caller, recipient];
    for (user in recipients.values()) {
      switch (messages.get(user)) {
        case (null) {
          messages.add(user, List.fromArray<Message>([fullMessage]));
        };
        case (?existing) {
          existing.add(fullMessage);
          messages.add(user, existing);
        };
      };
    };

    let notification = {
      to = recipient;
      message = "You have a new message!";
      timestamp = Time.now();
      isRead = false;
    };
    switch (notifications.get(recipient)) {
      case (null) {
        notifications.add(recipient, List.fromArray<Notification>([notification]));
      };
      case (?existing) {
        existing.add(notification);
        notifications.add(recipient, existing);
      };
    };
  };

  public query ({ caller }) func getConversationsWithUser(otherUser : Principal) : async [Message] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view conversations");
    };

    if (caller != otherUser and not isMatched(caller, otherUser)) {
      Runtime.trap("Unauthorized: Can only view conversations with matched users");
    };

    let allMessages = messagesForPair(caller, otherUser);
    allMessages.sort(Message.compareByTimestamp);
  };

  public query ({ caller }) func getAllConversations() : async [(Principal, [Message])] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view conversations");
    };

    let conversationMap = Map.empty<Principal, List.List<Message>>();

    switch (messages.get(caller)) {
      case (null) { () };
      case (?messageList) {
        messageList.forEach(func(msg) {
          let otherUser = if (msg.from == caller) { msg.to } else { msg.from };
          switch (conversationMap.get(otherUser)) {
            case (null) {
              conversationMap.add(otherUser, List.fromArray<Message>([msg]));
            };
            case (?existing) {
              existing.add(msg);
              conversationMap.add(otherUser, existing);
            };
          };
        });
      };
    };

    conversationMap.entries().map<(Principal, List.List<Message>), (Principal, [Message])>(
      func((user, msgList)) {
        (user, msgList.toArray().sort(Message.compareByTimestamp));
      }
    ).toArray();
  };

  public query ({ caller }) func getNotifications() : async [Notification] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view notifications");
    };

    switch (notifications.get(caller)) {
      case (null) { [] };
      case (?notificationList) {
        notificationList.toArray();
      };
    };
  };

  public shared ({ caller }) func markNotificationAsRead(_timestamp : Int) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can mark notifications as read");
    };

    switch (notifications.get(caller)) {
      case (null) { () };
      case (?notificationList) {
        let mapped = notificationList.map<Notification, Notification>(
          func(notification) {
            if (not notification.isRead) {
              { notification with isRead = true };
            } else {
              notification;
            };
          }
        );
        notifications.add(caller, mapped);
      };
    };
  };

  public query ({ caller }) func getUnreadNotificationCount() : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view notification count");
    };

    switch (notifications.get(caller)) {
      case (null) {
        0;
      };
      case (?notificationList) {
        notificationList.filter(func(notification) { not notification.isRead }).toArray().size();
      };
    };
  };

  public query ({ caller }) func getUserCount() : async Nat {
    profiles.keys().toArray().size();
  };

  public query ({ caller }) func isAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  public shared ({ caller }) func fillSampleData() : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can fill sample data");
    };

    let sampleProfiles = [
      {
        id = 1;
        principal = Principal.fromActor(actor "1");
        displayName = "Alice";
        lastActive = Time.now();
        photoLink = "https://example.com/alice.jpg";
        isActive = true;
        gender = #female;
        genderPreference = #male;
        interests = [{ id = 1; name = "Hiking" }];
      },
      {
        id = 2;
        principal = Principal.fromActor(actor "2");
        displayName = "Bob";
        lastActive = Time.now();
        photoLink = "https://example.com/bob.jpg";
        isActive = true;
        gender = #male;
        genderPreference = #female;
        interests = [{ id = 2; name = "Reading" }];
      },
      {
        id = 3;
        principal = Principal.fromActor(actor "3");
        displayName = "Carol";
        lastActive = Time.now();
        photoLink = "https://example.com/carol.jpg";
        isActive = true;
        gender = #female;
        genderPreference = #male;
        interests = [{ id = 3; name = "Cooking" }];
      },
    ];

    for (profile in sampleProfiles.values()) {
      profiles.add(profile.principal, profile);
    };
  };

  public query ({ caller }) func isAuthenticated() : async Bool {
    AccessControl.hasPermission(accessControlState, caller, #user);
  };

  // Username/Password credential system
  type UserCredentials = {
    principal : Principal;
    passwordHash : Text;
  };

  let usernameCredentials = Map.empty<Text, UserCredentials>();
  let principalToUsername = Map.empty<Principal, Text>();

  public query func isUsernameAvailable(username : Text) : async Bool {
    switch (usernameCredentials.get(username)) {
      case (null) { true };
      case (?_) { false };
    };
  };

  public shared ({ caller }) func registerWithCredentials(username : Text, passwordHash : Text) : async { #ok; #usernameTaken; #alreadyRegistered } {
    // Check if caller already has a username
    switch (principalToUsername.get(caller)) {
      case (?_) { return #alreadyRegistered };
      case (null) {};
    };
    // Check if username is taken
    switch (usernameCredentials.get(username)) {
      case (?_) { return #usernameTaken };
      case (null) {
        usernameCredentials.add(username, { principal = caller; passwordHash = passwordHash });
        principalToUsername.add(caller, username);
        // Ensure user has the #user role in access control
        switch (accessControlState.userRoles.get(caller)) {
          case (null) {
            accessControlState.userRoles.add(caller, #user);
          };
          case (?_) {};
        };
        #ok;
      };
    };
  };

  public query ({ caller }) func loginWithCredentials(username : Text, passwordHash : Text) : async Bool {
    switch (usernameCredentials.get(username)) {
      case (null) { false };
      case (?creds) {
        creds.principal == caller and creds.passwordHash == passwordHash;
      };
    };
  };

  public query ({ caller }) func getMyProfile() : async ?UserProfile.Profile {
    profiles.get(caller);
  };

  public query ({ caller }) func hasCompletedOnboarding() : async Bool {
    switch (profiles.get(caller)) {
      case (null) { false };
      case (?profile) { profile.displayName != "" };
    };
  };

  public query ({ caller }) func getMyUsername() : async ?Text {
    principalToUsername.get(caller);
  };

};
