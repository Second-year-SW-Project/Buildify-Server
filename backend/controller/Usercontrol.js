
const User = require("../model/Usermodel");

const getAllUsers = async(req,res,next) => {
    
    let Users;
    
    try{

        users = await User.find();
    
    
    }catch(err){
        console.log(err);
    }


    if(!users)
    {
        return res.status(404).json({message:"user not found"});
    }

    return res.status(200).json({users});


};


//adding products



const addUsers = async(req,res,next) => {
    
    
    const {name,age,category,_id} = req.body;
    
    
    let users;
    
    try{

        users = new User({name,age,category,_id});
        await users.save();

    
    
    }catch(err){
        console.log(err);
    }


    if(!users)
    {
        return res.status(404).json({message:"unable to add"});
    }

    return res.status(200).json({users});


};


//get paticular things using id

const getById = async(req,res,next) => {
    
    const id=req.params.id;
    let user; 

    try {
        user = await User.findById(id);
    } catch (err) {
        console.log(err);
        
    }

    if(!user)
    {
            return res.status(404).json({message:"unable to find"});
    }
    
    return res.status(200).json({user});




}


 

exports.getAllUsers = getAllUsers;
exports.addUsers = addUsers;
exports.getById = getById;

