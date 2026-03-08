const contacts_service = require("../../service/repository/Contacts.service");
const { generalResponse } = require("../../helper/response.helper");
const updateFieldsFilter = require("../../helper/updateField.helper");
const user_service = require("../../service/repository/user.service");

// async function createContacts(req, res) {
//   try {
//     let filteredData;
//     try {
//       filteredData = updateFieldsFilter(req.body, ["contact_details"], true);
//     } catch (err) {
//       return generalResponse(res, {}, "Data is Missing", false, true);
//     }

//     const user_id = req.authData.user_id;

//     // Step 1: Fetch existing contacts of the user
//     const existingUser = await user_service.getUser({ user_id });
//     let existingContacts = existingUser?.contact_details || [];

//     // Step 2: Create a map for faster number lookup
//     const numberMap = new Map();
//     existingContacts.forEach((contact) => {
//       numberMap.set(contact.number, contact);
//     });

//     // Step 3: Process incoming contacts
//     for (const item of filteredData?.contact_details || []) {
//       const existingContact = numberMap.get(item.number);

//       if (existingContact) {
//         // If contact exists, update the name
//         const user = await user_service.getUser({
//           mobile_num: item.number.toString(),
//         });

//         if (user) {
//           // Update name and user_id if changed
//           existingContact.name = item.name;
//           if (user.dataValues.user_id !== existingContact.user_id) {
//             existingContact.user_id = user.dataValues.user_id;
//           }
//         } else {
//           // User not found - remove contact from existingContacts
//           existingContacts = existingContacts.filter(
//             (c) => c.number !== item.number
//           );
//           numberMap.delete(item.number); // Also update map accordingly
//         }
//       } else {
//         // Else, fetch user and add new contact
//         const user = await user_service.getUser({
//           mobile_num: item.number.toString(),
//         });
//         if (user) {
//           existingContacts.push({
//             name: item.name,
//             number: item.number,
//             user_id: user?.dataValues?.user_id,
//           });
//         }
//       }
//     }

//     // Step 4: Save updated contact list
//     const newContacts = await contacts_service.updateContacts(
//       user_id,
//       existingContacts
//     );

//     return generalResponse(
//       res,
//       newContacts,
//       "Contacts created successfully.",
//       true,
//       true,
//       201
//     );
//   } catch (error) {
//     console.error("Error in creating Contacts", error);
//     return generalResponse(res, {}, error.message, false, true, 500);
//   }
// }

async function createContacts(req, res) {
  try {
    let filteredData;
    try {
      filteredData = updateFieldsFilter(req.body, ["contact_details"], true);
    } catch (err) {
      return generalResponse(res, {}, "Data is Missing", false, true);
    }

    const user_id = req.authData.user_id;

    // Step 1: Replace contacts directly
    let newContacts = [];

    for (const item of filteredData?.contact_details || []) {
      const user = await user_service.getUser({
        mobile_num: item.number.toString(),
      });

      if (user) {
        newContacts.push({
          name: item.name,
          number: item.number,
          user_id: user?.dataValues?.user_id,
        });
      }
    }

    // Step 2: Save new contact list (overwrite existing)
    const updatedContacts = await contacts_service.updateContacts(
      user_id,
      newContacts
    );

    return generalResponse(
      res,
      updatedContacts,
      "Contacts replaced successfully.",
      true,
      true,
      201
    );
  } catch (error) {
    console.error("Error in replacing Contacts", error);
    return generalResponse(res, {}, error.message, false, true, 500);
  }
}

module.exports = {
  createContacts,
};
