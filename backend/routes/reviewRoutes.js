const router=require("express").Router();
const Review=require("../models/Review");
const Booking=require("../models/Booking");
const Driver=require("../models/Driver");
const auth=require("../middleware/authMiddleware");
const role=require("../middleware/roleMiddleware");

router.post("/",auth,role("customer"),async(req,res,next)=>{
  try{
    const {bookingId,rating,comment}=req.body;
    const booking=await Booking.findOne({_id:bookingId,customerId:req.user.id,status:"completed"});
    if(!booking)return res.status(404).json({success:false,message:"Completed booking not found."});
    if(await Review.findOne({bookingId}))return res.status(409).json({success:false,message:"Booking already reviewed."});
    const review=await Review.create({bookingId,customerId:req.user.id,driverId:booking.driverId,rating,comment});
    const reviews=await Review.find({driverId:booking.driverId});
    const avg=reviews.reduce((s,r)=>s+r.rating,0)/reviews.length;
    await Driver.findByIdAndUpdate(booking.driverId,{ratingAverage:Number(avg.toFixed(2)),ratingCount:reviews.length});
    res.status(201).json({success:true,review});
  }catch(e){next(e);}
});

router.get("/driver/:driverId",auth,async(req,res,next)=>{
  try{res.json({success:true,reviews:await Review.find({driverId:req.params.driverId}).populate("customerId","name").sort({createdAt:-1})});}
  catch(e){next(e);}
});
module.exports=router;
