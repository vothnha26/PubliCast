'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserAccount extends Model {
    static associate(models) {
      UserAccount.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    }
  }
  UserAccount.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id'
    },
    provider: {
      type: DataTypes.ENUM('LOCAL', 'GOOGLE'),
      allowNull: false
    },
    providerId: {
      type: DataTypes.STRING,
      field: 'provider_id'
    },
    passwordHash: {
      type: DataTypes.STRING,
      field: 'password_hash'
    }
  }, {
    sequelize,
    modelName: 'UserAccount',
    tableName: 'user_accounts',
    underscored: true,
  });
  return UserAccount;
};