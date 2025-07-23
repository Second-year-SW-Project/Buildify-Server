import {Strategy as GoogleStrategy} from 'passport-google-oauth20';
import mongoose from 'mongoose';
import User from '../model/userModel.js'
import dotenv from "dotenv";
import jwt from 'jsonwebtoken';

dotenv.config({path: "./config.env"});

const configurePassport = (passport) => {
    passport.use(
        new GoogleStrategy(
          {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "https://buildify-server-d5yu.vercel.app/auth/google/callback",
          },
          async (accessToken, refreshToken, profile, done) => {
            try {
                let user = await User.findOne({ googleId: profile.id });
        
                if (!user) {
                  user = new User({
                    googleId: profile.id,
                    name: profile.displayName,
                    email: profile.emails[0].value,
                  });
        
                  await user.save();
                }
                const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
                    expiresIn: "7d",
                  });
          
                  done(null, { user, token });
                } catch (error) {
                  done(error, null);
                }
                
          }
        )
    );
    passport.serializeUser((data, done) => {
        done(null, data);
      });
      
      passport.deserializeUser((data, done) => {
        done(null, data);
      });
      

    
};

export default configurePassport;
