const express = require('express');
const bodyParser = require('body-parser');
const graphqlHttp = require('express-graphql');
const { buildSchema } = require('graphql');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Event = require('./models/Event');
const User = require('./models/User');

const app = express();

// Helper function, wrapper for async/await functions to avoid writing everywhere catch block
const catchErrors = fn => {
  return (...rest) => {
    return fn(...rest).catch(err => {
      throw err;
    });
  }
};

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/graphql', graphqlHttp({
  schema: buildSchema(`
    type Event {
      _id: ID
      title: String!
      description: String!
      price: Float!
      creator: ID!
      date: String!
    }
    
    type User {
      _id: ID,
      email: String!
      password: String
    }
    
    input EventInput {
      title: String!
      description: String!
      price: Float!
    }
    
    input UserInput {
      email: String!
      password: String!
    }
    
    type RootQuery {
      events: [Event!]!
    }
    
    type RootMutation {
      createEvent(eventInput: EventInput): Event
      createUser(userInput: UserInput): User
    }
    
    schema {
      query: RootQuery
      mutation: RootMutation
    }
  `),
  rootValue: {
    events: catchErrors(async () => {
      const events = Event.find();

      return events.map(event => ({ ...event._doc }));
    }),
    createEvent: catchErrors(async args => {
      const event = new Event({
        title: args.eventInput.title,
        description: args.eventInput.description,
        price: parseFloat(args.eventInput.price),
        creator: mongoose.Types.ObjectId('5c56937a80ce7733d43eff1a')
      });
      const savedEvent = await event.save();
      // Perhaps, we should add a check if user exists or not
      // But, if we have an authorization, it doesn't make sense IMHO
      const user = await User.findOne({ _id: savedEvent.creator });
      if (!user.createdEvents) {
        user.createdEvents = [];
      }
      user.createdEvents.push(savedEvent.id);
      await user.save();

      return { ...savedEvent._doc };
    }),
    createUser: catchErrors(async args => {
      const existingUser = await User.findOne({ email: args.userInput.email });
      if (existingUser) {
        throw new Error('User exists already.');
      }

      const hashedPassword = await bcrypt.hash(args.userInput.password, 12);
      const user = new User({
        email: args.userInput.email,
        password: hashedPassword
      });
      const savedUser = await user.save();

      return { ...savedUser._doc, password: null };
    })
  },
  graphiql: true
}));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true })
  .then(() => console.log('Connected to the DB'))
  .catch(err => console.log(err));
// Turn off deprecation
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

app.listen(3000, () => {
  console.log('Active on port 3000');
});
