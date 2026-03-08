module.exports = (sequelize, DataTypes) => {
  const DailyUsers = sequelize.define("DailyUsers", {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
   date: {
  type: DataTypes.DATEONLY, // or DataTypes.DATE
  allowNull: false
},
    users_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  });
  return DailyUsers;
};
