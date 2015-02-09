var Tasks = new Meteor.Collection("tasks");


if (Meteor.isClient) {
  Meteor.subscribe("tasks");

  // Meteor.call("getTasks",function(err,data){
  //   Session.set("tasks", data);
  // });

  Template.body.helpers({
    tasks: function() {
      if(Session.get("hideCompleted")){
        return Tasks.find({checked: {$ne: true}},{sort: {
          createdDate: -1
        }})
      }
      else{
      // return Tasks.find({}, {
      //   sort: {
      //     createdDate: -1
      //   }
      // })
      Meteor.call("getTasks",function(err,data){
        //alert('tasks method : getting');
        Session.set("tasks", data);
      });
      //alert('getting');
      return Session.get("tasks");
      }},
      incompleteCount: function(){
        return Tasks.find({checked: {$ne: true}}).count();
      }

  });

  Template.body.events({
    "submit .new-task": function(event) {
      var text = event.target.text.value;
      Meteor.call("createTask", text,function(error, result){
        //alert('inside insert call back');
        //alert(result);
        var tasks = Session.get("tasks");
        //alert(tasks);
        //alert("1");
        tasks.unshift(result);
        //alert(tasks);
        //alert("2");
        Session.set("tasks",tasks);
        //event.target.text.value = 'been there';

      });
      event.target.text.value = "";
      return false;
    },
    "change .hide-completed input": function(event){
      Session.set("hideCompleted",event.target.checked)
    }
  });

  Template.task.helpers({
    isOwner: function(){
      return this.owner === Meteor.userId();
    }
  });

  Template.task.events({
    "click .delete": function(){
      Meteor.call("deleteTask",this['@rid'], function(error, result){
        var tasks = Session.get("tasks");
        tasks.shift(result);
        Session.set("tasks",tasks);
        //alert('delete shifted');
      });
    },
    "click .toggle-checked": function(){
      Meteor.call("toggleChecked",this._id, ! this.checked);
    },
    "click .toggle-private": function(){
      Meteor.call("togglePrivate", this._id, !this.private)
    }
  });


  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });
}

if (Meteor.isServer) {
  var oriento = Meteor.npmRequire('oriento');
  var server = oriento({
    host: "localhost",
    port: 2424,
    username: "root",
    password: "R3T81iMd"
  });
  var db = server.use('meteorDB');

  Meteor.publish("tasks", function() {
    return Tasks.find({
      $or: [
        {private: {$ne: true}},
        {owner: this.userId}
      ]
    });
  });


  Meteor.methods({

    getTasks:function(){
      console.log("inside get tasks orient ");
      var tasks = Async.runSync(function(done){
        db.select().from('Tasks').order('@rid desc').all().then(function(records){
          console.log('records-tasks: ', records);
          done(null,records);
        });
      });
      console.log("tasks - records ",tasks.result);
      return tasks.result;
    },

    createTask: function(text) {
      if (! Meteor.userId()) {
        throw new Meteor.Error("not-authorized");
      }

      //console.log("this is server");

      // Tasks.insert({
      //   text: text,
      //   createdDate: new Date(),
      //   checked: false,
      //   owner: Meteor.userId(),
      //   username: Meteor.user().username,
      //   private: false
      // });
      var startTime = new Date();
      //console.log("Insert startTime: ", startTime);
      //console.log("startTime time: ", startTime.getTime());

      var newTask = Async.runSync(function(done){
        db.insert().into('Tasks').set({text: text,
      createdDate: new Date(),
      checked: false,
      owner: Meteor.userId(),
      username: Meteor.user().username,
      private: false}).one().then(function(result){
        console.log("Insert result : ", result);
        var endTime = new Date();
        //console.log("endTime: ", endTime);
        //console.log("endTime time: ", endTime.getTime());
        console.log("Insert time : ", endTime - startTime, " ms");
        console.log("Insert time time : ", (endTime.getTime() - startTime.getTime())/1000, " s");
        done(null,result);
      });

    });
    console.log(newTask.result);
    return newTask.result;

    },

    deleteTask: function(taskId){
      //var task = Tasks.findOne(taskId);
      console.log("inside delete @rid : ", taskId);
      var taskIdString = '#'+taskId.cluster+':'+taskId.position;
      console.log("inside delete @rid str : ", taskIdString);
      var deletedReturn = Async.runSync(function(done){
        db.record.get(taskIdString).then(function(task){
        if(task.private && task.owner !== Meteor.userId()){
          throw new Meteor.error("not-authorized");
        }
        db.record.delete(taskIdString).then(function(result){
          console.log("record deleted : ");
        });
        done(null, task);
      });
    });
    console.log('del ret' , deleteReturn.result);
    return deleteReturn.result;
      // if(task.private && task.owner !== Meteor.userId()){
      //   throw new Meteor.error("not-authorized");
      // }
      // Tasks.remove(taskId);
    },

    toggleChecked: function(taskId, checked){
      var task = Tasks.findOne(taskId);
      if (task.private && task.owner !== Meteor.userId()) {
        // If the task is private, make sure only the owner can check it off
        throw new Meteor.Error("not-authorized");
      }

      Tasks.update(taskId,{$set: {checked: checked}})
    },
    togglePrivate: function(taskId, private){
      var task = Tasks.findOne(taskId);
      if (task.private && task.owner !== Meteor.userId()) {
        // If the task is private, make sure only the owner can check it off
        throw new Meteor.Error("not-authorized");
      }

      Tasks.update(taskId, {$set: {private: private}})
    }

  });

  Meteor.startup(function() {
    // code to run on server at startup
    console.log("inside startup");
    //
    // db.class.list().then(function(classes) {
    //   console.log("classes:  ",classes);
    //   var classesString = classes.stringify(classes);
    //   console.log("stringify "+classesString);
    //   if(classesString.indexOf('Tasks') > -1){
    //     console.log("Class Tasks already present");
    //     //  myClass.property.list().then(function(properties){
    //     //   console.log("Tasks class existing properties: ", properties);
    //     // });
    //   }
    //   else{
    //     db.class.create('Tasks').then(function(newClass){
    //       console.log("Tasks class created");
    //
    //       newClass.property.create({
    //         name: "text",
    //         type: "String"
    //       }).then(function(){
    //         console.log("Property text created");
    //       });
    //
    //       newClass.property.create({
    //         name: "createdDate",
    //         type: "Date"
    //       }).then(function(){
    //         console.log("Property createdDate created");
    //       });
    //
    //       newClass.property.create({
    //         name: "checked",
    //         type: "boolean"
    //       }).then(function(){
    //         console.log("Property checked created");
    //       });
    //
    //       newClass.property.create({
    //         name: "owner",
    //         type: "String"
    //       }).then(function(){
    //         console.log("Property owner created");
    //       });
    //
    //       newClass.property.create({
    //         name: "username",
    //         type: "String"
    //       }).then(function(){
    //         console.log("Property username created");
    //       });
    //
    //       newClass.property.create({
    //         name: "private",
    //         type: "boolean"
    //       }).then(function(){
    //         console.log("Property private created");
    //       });
    //
    //     });
    //   }
    // });
  });
}
