/// <reference path="../../ts/global.d.ts" />

module ag.utils
{
   export function scorePassword(password)
   {      
      var score: any = 0;
      
      if (!password)
         return score;

      // Award every unique letter until 5 repetitions
      var letters = {};
      for (var i = 0; i < password.length; i++)
      {
         letters[password[i]] = (letters[password[i]] || 0) + 1;
         score += 5.0 / letters[password[i]];
      }

      // Bonus points for mixing it up
      var variations =
      {
         digits: /\d/.test(password),
         lower: /[a-z]/.test(password),
         upper: /[A-Z]/.test(password),
         nonWords: /\W/.test(password)
      };

      var variationCount = 0;
      for (var check in variations)
         variationCount += (variations[check] === true) ? 1 : 0;

      score += (variationCount - 1) * 10;
      
      return parseInt(score, 10);
   }

   export function checkPasswordStrength(password)
   {
      var score = scorePassword(password),
         strength = strings.weak;

      if (score > 80)
         strength = strings.strong;
      if (score > 50)
         strength = strings.good;
      if (score < 20)
         strength = "";

      if (strength.length)
         return "{0} {1}".format(strings.passStrength, strength);
      else
         return "";
   }
}