/* Optional Supabase adapter. No server credentials or user data are stored in the repository. */
(function(root){
  'use strict';
  let sdkPromise;
  function loadSdk(){
    if (root.supabase?.createClient) return Promise.resolve(root.supabase);
    if (!sdkPromise) sdkPromise = new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/dist/umd/supabase.min.js';
      s.onload=()=>root.supabase?.createClient ? resolve(root.supabase) : reject(new Error('Cloud SDK unavailable'));
      s.onerror=()=>reject(new Error('Unable to load cloud SDK. Check internet access.'));
      document.head.append(s);
    });
    return sdkPromise;
  }
  class GigCloud {
    constructor(){this.client=null;this.user=null;}
    async init(url,key){
      if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) throw new Error('Enter your valid https Supabase project URL.');
      if(!key?.trim()) throw new Error('Enter the project publishable/anon key.');
      const lib=await loadSdk();
      this.client=lib.createClient(url.replace(/\/$/,''),key,{auth:{persistSession:true,autoRefreshToken:true}});
      const {data,error}=await this.client.auth.getUser();
      if(error && error.name!=='AuthSessionMissingError' && !/Auth session missing/i.test(error.message||'')) throw error;
      this.user=data?.user||null;
      return this.user;
    }
    async signIn(email,password){const {data,error}=await this.client.auth.signInWithPassword({email,password});if(error)throw error;this.user=data.user;return data.user;}
    async signUp(email,password){const {data,error}=await this.client.auth.signUp({email,password});if(error)throw error;this.user=data.session?.user||null;return data;}
    async signOut(){if(this.client){const {error}=await this.client.auth.signOut();if(error)throw error;}this.user=null;}
    async load(){
      if(!this.user)throw new Error('Sign in before syncing.');
      const {data,error}=await this.client.from('gigledger_data').select('payload').eq('user_id',this.user.id).maybeSingle();
      if(error)throw error;
      return data?.payload ?? null;
    }
    async save(payload){
      if(!this.user)throw new Error('Sign in before syncing.');
      const {error}=await this.client.from('gigledger_data').upsert({user_id:this.user.id,payload,updated_at:new Date().toISOString()},{onConflict:'user_id'});
      if(error)throw error;
    }
  }
  root.GigCloud=GigCloud;
})(window);