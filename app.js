const express = require('express');
const bodyParser = require('body-parser');
const graphqlHttp = require('express-graphql');
const { buildSchema } = require('graphql');
const mongoose = require('mongoose');

const Event = require('./models/Event');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/graphql', graphqlHttp({
  schema: buildSchema(`
    type Event {
      _id: ID
      title: String!
      description: String!
      price: Float!
      date: String!
    }
    
    input EventInput {
      title: String!
      description: String!
      price: Float!
    }
    
    type RootQuery {
      events: [Event!]!
    }
    
    type RootMutation {
      createEvent(eventInput: EventInput): Event
    }
    
    schema {
      query: RootQuery
      mutation: RootMutation
    }
  `),
  rootValue: {
    events: () => {
      return Event.find()
        .then(events => {
          return events.map(event => {
            return { ...event._doc };
          });
        })
        .catch(err => {
          throw err
        });
    },
    createEvent: args => {
      const event = new Event({
        title: args.eventInput.title,
        description: args.eventInput.description,
        price: parseFloat(args.eventInput.price)
      });

      return event.save()
        .then(result => {
          return { ...result._doc };
        })
        .catch(err => {
          throw err
        });
    }
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
