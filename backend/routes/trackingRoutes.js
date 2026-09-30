const router=require("express").Router();
const Booking=require("../models/Booking");
const Driver=require("../models/Driver");
const auth=require("../middleware/authMiddleware");
const role=require("../middleware/roleMiddleware");

router.post("/:bookingId/location",auth,role("driver"),async(req,res,next)=>{
  try{
    const {lat,lng,heading=null,speed=null}=req.body;
    if(typeof lat!=="number"||typeof lng!=="number")return res.status(400).json({success:false,message:"lat and lng are required."});
    const booking=await Booking.findById(req.params.bookingId);
    const driver=await Driver.findOne({userId:req.user.id});
    if(!booking||!driver||booking.driverId.toString()!==driver._id.toString())return res.status(403).json({success:false,message:"Not authorized."});
    if(booking.status!=="ongoing")return res.status(400).json({success:false,message:"Trip is not ongoing."});
    const payload={bookingId:booking._id.toString(),lat,lng,heading,speed,timestamp:new Date().toISOString()};
    req.app.get("io").to(`booking:${booking._id}`).emit("driverLocation",payload);
    res.json({success:true,location:payload});
  }catch(e){next(e);}
});
module.exports=router;
