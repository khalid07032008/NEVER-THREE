window.NT={
 address:'0x1Cc0F4609A2C7a263Db00E8c8327B8df36e6E392',
 owner:'0x8457e4659f3464B21951e34cd48A76938Cc74E86',
 cid:'bafybeiextg2mbqznbu5xnqgddc5k5oxxwfr2it3xbnfhk25f3t2bkxfigq',
 slugs:['common','rare','legendary'],prices:['0.0004','0.001','0.002'],caps:[1500n,500n,222n],
 abi:['function owner() view returns(address)','function treasury() view returns(address)','function cap(uint8) view returns(uint256)','function price(uint8) view returns(uint256)','function mintedByTier(uint256) view returns(uint256)','function saleActive() view returns(bool)','function mint(uint8,uint256) payable','function setSaleActive(bool)','event Minted(address indexed buyer,uint8 indexed tier,uint256 quantity,uint256 firstTokenId)'],
 async connect(){
  if(!window.ethereum?.request)throw Error('Open this page in your wallet browser or a browser with a wallet extension.');
  await window.ethereum.request({method:'eth_requestAccounts'});
  try{await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x1237'}]});}catch(e){if(e.code!==4902)throw e;await window.ethereum.request({method:'wallet_addEthereumChain',params:[{chainId:'0x1237',chainName:'Robinhood Chain',nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18},rpcUrls:['https://rpc.mainnet.chain.robinhood.com'],blockExplorerUrls:['https://robinhoodchain.blockscout.com']}]});}
  const provider=new ethers.BrowserProvider(window.ethereum),signer=await provider.getSigner(),account=await signer.getAddress();
  await this.checkWallet(account);return {provider,signer,account,contract:new ethers.Contract(this.address,this.abi,signer)};
 },
 async checkWallet(account){if(await window.ethereum.request({method:'eth_chainId'})!=='0x1237')throw Error('Switch to Robinhood Chain (4663).');const accounts=await window.ethereum.request({method:'eth_accounts'});if(accounts[0]?.toLowerCase()!==account.toLowerCase())throw Error('Wallet changed. Connect again.');},
 async checkContract(c){if((await c.treasury()).toLowerCase()!==this.owner.toLowerCase())throw Error('Collection payout address mismatch.');for(let i=0;i<3;i++)if(await c.cap(i)!==this.caps[i]||await c.price(i)!==ethers.parseEther(this.prices[i]))throw Error('Collection price or supply mismatch.');},
 // Solidity 0.8.30 storageLayout for this deployed build places tierURIs at slots 12–14.
 async checkMetadata(provider){for(let i=0;i<3;i++){const slot=12n+BigInt(i),raw=await provider.getStorage(this.address,slot),value=BigInt(raw);let data;if(value%2n===0n){const length=Number(value&255n)/2;if(length>31)throw Error('Invalid metadata storage.');data=ethers.getBytes(raw).slice(0,length);}else{const length=Number((value-1n)/2n);if(length>512)throw Error('Unexpected metadata length.');const start=BigInt(ethers.keccak256(ethers.zeroPadValue(ethers.toBeHex(slot),32)));const parts=[];for(let n=0;n<Math.ceil(length/32);n++)parts.push(await provider.getStorage(this.address,start+BigInt(n)));data=ethers.getBytes(ethers.concat(parts)).slice(0,length);}if(ethers.toUtf8String(data)!==`ipfs://${this.cid}/${this.slugs[i]}.json`)throw Error('On-chain metadata does not match '+this.slugs[i]+'.');}},
 error(e){return e.code===4001||e.code==='ACTION_REJECTED'?'Cancelled in wallet.':e.shortMessage||e.message||'Request failed.';},
 link(hash){const a=document.createElement('a');a.href='https://robinhoodchain.blockscout.com/tx/'+hash;a.target='_blank';a.rel='noopener';a.textContent='View transaction';return a;}
};
