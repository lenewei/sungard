/// <reference path="../../ts/global.d.ts" />
/// <reference path="../ag.ts" />
/// <reference path="../utils/network.ts" />

module ag
{ 
   export class ControllerProxy
   {
      net = new utils.Network();

      constructor()
      {
      }

      serviceUrl()
      {
         return utils.normalizeUrl(ag.serviceUrl);
      }
   }   
}
