// mail: Array(12)
// 0:
// item: "{"name": "stick", "level": 0}"
// fro: "Merchant001"
// to: "thmsn"
// taken: false
// message: ""
// id: "....."
// sent: "2022-11-13 20:42:39.455338"
// subject: ""

// get mails
// function cacheEmailsOnCharacter(data) {
//     if (!character.bank) {
//       console.warn("not in bank!");
//       return;
//     }
//     let mails = data.mail;
//     for (const mail of mails) {
//       if (mail.item && !mail.taken) {
//         if (!character.bank.mails) {
//           character.bank.mails = [];
//         }
//         character.bank.mails.push(JSON.parse(mail.item));
//       }
//     }
//     show_json(character.bank.mails);
//   }

//   game.on("api_response", function (data) {
//     if (data.type == "mail") {
//       console.log(data);
//       (<any>parent).cacheEmailsOnCharacter(data);
//     }
//   });
//   parent.api_call("pull_mail");
