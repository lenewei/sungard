/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    (function (utils) {
        function scorePassword(password) {
            var score = 0;

            if (!password)
                return score;

            // Award every unique letter until 5 repetitions
            var letters = {};
            for (var i = 0; i < password.length; i++) {
                letters[password[i]] = (letters[password[i]] || 0) + 1;
                score += 5.0 / letters[password[i]];
            }

            // Bonus points for mixing it up
            var variations = {
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
        utils.scorePassword = scorePassword;

        function checkPasswordStrength(password) {
            var score = scorePassword(password), strength = ag.strings.weak;

            if (score > 80)
                strength = ag.strings.strong;
            if (score > 50)
                strength = ag.strings.good;
            if (score < 20)
                strength = "";

            if (strength.length)
                return "{0} {1}".format(ag.strings.passStrength, strength);
            else
                return "";
        }
        utils.checkPasswordStrength = checkPasswordStrength;
    })(ag.utils || (ag.utils = {}));
    var utils = ag.utils;
})(ag || (ag = {}));
