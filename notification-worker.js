// Notification display/click support only. No offline caching or background push.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const url=new URL(event.notification.data?.url||'/?shopping=1',self.location.origin);
 if(url.origin!==self.location.origin)return;
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{const client=clients.find(c=>new URL(c.url).origin===url.origin);if(client){await client.focus();client.postMessage({type:'chill-open-shopping'});}else await self.clients.openWindow(url.href);}));
});
