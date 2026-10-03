(()=>{
 const $=id=>document.getElementById(id);let session,busy=false,live=false,counts=null,epoch=0,refreshing=false;
 const publicProvider=new ethers.JsonRpcProvider('https://rpc.mainnet.chain.robinhood.com',4663,{staticNetwork:true});
 const reader=new ethers.Contract(NT.address,NT.abi,publicProvider);
 function limit(){return counts?Math.max(0,Math.min(100,Number(NT.caps[selected]-counts[selected]))):100;}
 function quantity(){const raw=$('mintQuantity').value.trim();const n=Number(raw);return raw!==''&&Number.isInteger(n)&&n>=1&&n<=limit()?n:null;}
 function render(){const max=limit(),q=quantity(),sold=counts&&max===0;
  $('mintQuantity').max=String(max);$('mintQuantity').disabled=busy||sold;
  $('quantityMinus').disabled=busy||sold||!q||q<=1;$('quantityPlus').disabled=busy||sold||!q||q>=max;
  $('quantityError').textContent=sold?'':q?'':`Enter a whole number from 1 to ${max}.`;
  $('mintQuantity').setAttribute('aria-invalid',String(!q&&!sold));
  const total=q?ethers.formatEther(ethers.parseEther(NT.prices[selected])*BigInt(q)):null;
  $('mintTotal').textContent=total?total+' ETH':'—';
  $('mintSubmit').disabled=busy||!session||!counts||!live||sold||!q;$('wallet').disabled=busy;
  $('mintSubmit').textContent=busy?'Waiting for wallet / network…':!session?'Connect wallet to mint':!counts?'Status unavailable':sold?'Sold out':!live?'Mint closed':!q?'Choose a valid quantity':`Mint ${q} · ${total} ETH`;
  $('remaining').textContent=counts?`${NT.caps[selected]-counts[selected]} of ${NT.caps[selected]} remaining`:'Connect your wallet to check availability.';
 }
 $('mintQuantity').addEventListener('input',render);
 $('quantityMinus').onclick=()=>{const q=quantity();if(!busy&&q&&q>1){$('mintQuantity').value=String(q-1);render();}};
 $('quantityPlus').onclick=()=>{const q=quantity();if(!busy&&q&&q<limit()){$('mintQuantity').value=String(q+1);render();}};

 async function refresh(){if(refreshing||busy)return;refreshing=true;const token=epoch;try{const c=session?.contract||reader;const result=await Promise.all([c.saleActive(),...NT.caps.map((_,i)=>c.mintedByTier(i))]);if(token!==epoch)return;live=result[0];counts=result.slice(1);$('saleLabel').textContent=live?'Mint open':'Mint closed';$('mintState').textContent=live?'Open':'Closed';}catch{if(token!==epoch)return;counts=null;live=false;$('saleLabel').textContent='Connect wallet to check mint';$('mintState').textContent='Not verified';}finally{refreshing=false;render();}}
 function reset(){epoch++;session=null;live=false;counts=null;$('walletStatus').textContent='Wallet or network changed. Connect again.';render();}
 window.ethereum?.on?.('accountsChanged',reset);window.ethereum?.on?.('chainChanged',reset);
 window.addEventListener('selectionchanged',render);
 $('wallet').onclick=async()=>{if(busy)return;busy=true;render();try{const next=await NT.connect();await NT.checkContract(next.contract);await NT.checkWallet(next.account);session=next;epoch++;$('walletStatus').textContent='Connected: '+next.account;}catch(e){session=null;$('walletStatus').textContent=NT.error(e);}finally{busy=false;await refresh();render();}};
 $('mintSubmit').onclick=async()=>{
  if(busy||!session||!live||!counts||!quantity())return;
  const current=session,tier=selected,token=epoch,amount=quantity();let hash;busy=true;render();
  try{
   await NT.checkWallet(current.account);await NT.checkContract(current.contract);
   if(!await current.contract.saleActive())throw Error('Mint is closed.');
   const available=NT.caps[tier]-await current.contract.mintedByTier(tier);if(BigInt(amount)>available)throw Error(`Only ${available} NFTs remain for this form. Choose a smaller quantity.`);
   const value=ethers.parseEther(NT.prices[tier])*BigInt(amount);
   const gas=await current.contract.mint.estimateGas(tier,amount,{value});
   await NT.checkWallet(current.account);if(token!==epoch)throw Error('Wallet changed. Connect again.');
   $('mintResult').textContent=`Review minting ${amount} × ${people[tier].name} for ${ethers.formatEther(value)} ETH plus network gas in your wallet.`;
   const tx=await current.contract.mint(tier,amount,{value,gasLimit:gas*120n/100n});hash=tx.hash;
   $('mintResult').replaceChildren(document.createTextNode('Mint submitted. Waiting for confirmation. '),NT.link(hash));
   const receipt=await tx.wait();if(receipt.status!==1)throw Error('Mint transaction failed.');
   let minted;for(const log of receipt.logs){if(log.address.toLowerCase()!==NT.address.toLowerCase())continue;try{const event=current.contract.interface.parseLog(log);if(event?.name==='Minted'&&event.args.buyer.toLowerCase()===current.account.toLowerCase()&&event.args.tier===BigInt(tier)&&event.args.quantity===BigInt(amount))minted=event;}catch{}}
   if(!minted)throw Error('Mint event not found. Check the transaction before retrying.');
   $('mintResult').replaceChildren(document.createTextNode(`${amount} × ${people[tier].name} minted to ${current.account}. Token${amount===1?'':'s'} #${minted.args.firstTokenId}${amount===1?'':'–#'+(minted.args.firstTokenId+BigInt(amount)-1n)}. `),NT.link(hash));
  }catch(e){$('mintResult').textContent=NT.error(e);if(hash){$('mintResult').append(document.createTextNode(' Check this submitted transaction before retrying: '),NT.link(hash));session=null;}}
  finally{busy=false;await refresh();render();}
 };
 render();refresh();setInterval(()=>{if(!document.hidden)refresh();},20000);
})();
