import React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [form,setForm]=useState({email:"",password:""});
  const [error,setError]=useState("");
  const {login}=useAuth(); const navigate=useNavigate();

  async function submit(e){
    e.preventDefault(); setError("");
    try{
      const {data}=await api.post("/auth/login",form);
      console.log("LOGIN RESPONSE:", data);
      console.log("USER ROLE:", data.user.role);

      login(data);
      navigate(data.user.role==="customer"?"/customer":data.user.role==="driver"?"/driver":"/admin");
    }catch(err){setError(err.response?.data?.message||"Login failed.");}
  }
  return <div className="auth"><form className="card" onSubmit={submit}><h1>Welcome back</h1><input placeholder="Email" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/><input placeholder="Password" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required/><button>Login</button>{error&&<p className="error">{error}</p>}<p>New user? <a href="/register">Create account</a></p></form></div>;
}
