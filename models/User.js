
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define("User", {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "",
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "",
    },
    user_name: {
      type: DataTypes.STRING,
      unique: true, // This will ensure only one unique index is created
      allowNull: true,
      get() {
        const data = this.getDataValue("user_name");
        if (!data) {
          return "";
        }

        return data;
      },
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "",
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true, // This will ensure only one unique index is created
      get() {
        const data = this.getDataValue("email");
        if (!data) {
          return "";
        }

        return data;
      },
    },
    country_code: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    socket_ids: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    mobile_num: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true, // This will ensure only one unique index is created
      get() {
        const data = this.getDataValue("mobile_num");
        if (!data) {
          return "";
        }

        return data;
      },
    },
    otp: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: " ",
    },
    login_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    profile_pic: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "",
      get() {
        const raw_urls = this.getDataValue("profile_pic");
        if (raw_urls == null) {
          return `${process.env.baseUrl}/uploads/not-found-images/profile-image.png`;
        }
        const imageUrls = `${process.env.baseUrl}/${raw_urls}`;

        return imageUrls != `${process.env.baseUrl}/`
          ? imageUrls
          : `${process.env.baseUrl}/uploads/not-found-images/profile-image.png`;
      },
    },
    selfie: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "",
      get() {
        const raw_urls = this.getDataValue("selfie");
        const imageUrls = `${process.env.baseUrl}${raw_urls}`;
        return imageUrls != process.env.baseUrl ? imageUrls : ``;
      },
    },
    dob: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      get() {
        const data = this.getDataValue("dob");
        if (!data) {
          return "";
        }
        return data;
      },
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Male",
    },
    country: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    country_short_name: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    bio: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Available",
    },
    device_token: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "",
    },
    profile_verification_status: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    login_verification_status: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_private: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_admin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    platforms: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
      set(value) {
        if (Array.isArray(value)) {
          const cleaned = value.filter(
            (item) => typeof item === "string" && item.trim() !== ""
          );
          this.setDataValue("platforms", cleaned);
        } else {
          this.setDataValue("platforms", []);
        }
      },
    },
    ip_address: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
      set(value) {
        if (Array.isArray(value)) {
          const cleaned = value.filter(
            (item) => typeof item === "string" && item.trim() !== ""
          );
          this.setDataValue("ip_address", cleaned);
        } else {
          this.setDataValue("ip_address", []);
        }
      },
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    blocked_by_admin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    viewed_by_admin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    contact_details: {
      type: DataTypes.JSONB, // Using JSONB to store array of objects
      allowNull: false,
      defaultValue: [],
    },
    total_media_limit: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "0",
    },
    used_media_limit: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "0",
    },
    available_media_limit: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "0",
    },
    user_type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "regular"
    },
    is_demo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  });
  User.associate = function (models) {

    User.hasMany(models.Message_seen, {
      foreignKey: "user_id",
      allowNull: true,
      defaultValue: 0,
      onDelete: "CASCADE",
    });
    User.hasMany(models.Participant, {
      foreignKey: "user_id",
      allowNull: true,
      defaultValue: 0,
      onDelete: "CASCADE",
    });
    User.hasMany(models.Message, {
      foreignKey: "sender_id",
      allowNull: true,
      defaultValue: 0,
      onDelete: "CASCADE",
    });
    User.hasMany(models.Message, {
      foreignKey: "peer_user",
      as: "ActionedUser",
      allowNull: true,
      defaultValue: 0,
      onDelete: "CASCADE",
    });
    User.belongsToMany(models.User, {
      through: models.Block,
      foreignKey: "user_id",
      as: "blocker",
      onDelete: "CASCADE",
    });
    User.belongsToMany(models.User, {
      through: models.Block,
      foreignKey: "blocked_id",
      as: "blocked",
      onDelete: "CASCADE",
    });
    User.hasMany(models.Report, {
      foreignKey: "report_by",
      as: "reportsMade",
      onDelete: "CASCADE",
    });

    User.hasMany(models.Report, {
      foreignKey: "report_to",
      as: "reportsReceived",
      onDelete: "CASCADE",
    });


    User.hasMany(models.Story, {
      foreignKey: "user_id",
      onDelete: "CASCADE",
      as: "stories"
    });


  };

  return User;
};
