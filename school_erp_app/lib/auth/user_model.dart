class UserModel {
  final String userId;
  final String email;
  final String name;
  final String roleCode;
  final String? branchId;
  final String? branchName;

  UserModel({
    required this.userId,
    required this.email,
    required this.name,
    required this.roleCode,
    this.branchId,
    this.branchName,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      userId: json['userId']?.toString() ?? json['user_id']?.toString() ?? '',
      email: json['email']?.toString() ?? json['user_email_id']?.toString() ?? '',
      name: json['name']?.toString() ?? json['user_first_name']?.toString() ?? '',
      roleCode: json['role_code']?.toString() ?? json['user_role']?.toString() ?? '',
      branchId: json['branch_id']?.toString() ?? json['user_branch_id']?.toString(),
      branchName: json['branch_name']?.toString() ?? json['branchName']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'email': email,
      'name': name,
      'role_code': roleCode,
      'branch_id': branchId,
      'branch_name': branchName,
    };
  }
}

