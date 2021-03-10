const { AuthenticationError } = require('apollo-server-core');
const { User, Thought } = require('../models')
const { signToken } = require("../utils/auth")


const resolvers = {
    Query: {
        // get all thoughts with option to filter by username
        thoughts: async (parent, { username }) => {
            const params = username ? { username } : {};
            return Thought.find(params)
              .sort({ createdAt: -1 });
        },
        //   get one thought by id
        thought: async (parent, { _id }) => {
            return Thought.findOne({ _id });
          },
        //   get all users
        users: async () => {
            return User.find()
                .select('-__v -password')
                .populate('friends')
                .populate('thoughts')
        }, 
        // get a user by username
        user: async (parent, { username }) => {
            return User.findOne({ username })
              .select('-__v -password')
              .populate('friends')
              .populate('thoughts')
        }, 
        me: async (parent, args, context) => {
            if (context.user) {
              const userData = await User.findOne({ _id: context.user._id })
                .select('-__v -password')
                .populate('thoughts')
                .populate('friends');
          
              return userData;
            }
          
            throw new AuthenticationError('Not logged in');
          }
            
    }, 
    
    Mutation: {
        addUser: async (parent, args) => {
            const user = await User.create(args)
            return user;
        },
        login: async (parent,{ email, password }) => {
            const user = await User.findOne({ email })
            // if incorrect username
            if(!User) {
                throw new AuthenticationError("Incorrect credentials")
            }

            const correctPw = await user.isCorrectPassword(password);
            // if incorrect password
            if(!correctPw) {
                throw new AuthenticationError('Incorrect credentials');
            }
            // jwt token
            const token = signToken(user)

            return { token, user }
        }, 
        addThought: async (parent, args, context) => {
            // if user is logged in
            if(context.user) {
                const thought = await Thought.create({ ...args, username: context.user.username })
                // get user id and update thought array
                await User.findByIdAndUpdate(
                    { _id: context.user._id },
                    { $push: { thoughts: thought._id } },
                    // returns updated document
                    { new: true }
                );
                return thought
            }
            // if not logged in, throw error
            throw new AuthenticationError("YUou need to be logged in!")
        },
        addReaction: async (parent, { thoughtId, reactionBody }, context) => {
            if (context.user) {
              const updatedThought = await Thought.findOneAndUpdate(
                { _id: thoughtId },
                { $push: { reactions: { reactionBody, username: context.user.username } } },
                { new: true, runValidators: true }
              );
          
              return updatedThought;
            }
          
            throw new AuthenticationError('You need to be logged in!');
          },
          addFriend: async (parent, { friendId }, context) => {
              if(context.user) {
                  const updatedUser = await User.findOneAndUpdate(
                      { _id: context.user._id },
                      { $addToSet: { friends: friendId } },
                      { new: true }
                  ).populate('friends')

                  return updatedUser
              }

              throw new AuthenticationError("You need to be logged in to make friends!")
          }
    }
};

module.exports = resolvers;