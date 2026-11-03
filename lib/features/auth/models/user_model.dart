import 'package:equatable/equatable.dart';

class UserModel extends Equatable {
  final String id;
  final String name;
  final String email;
  final String? username;
  final String? avatarUrl;

  const UserModel({
    required this.id,
    required this.name,
    required this.email,
    this.username,
    this.avatarUrl,
  });

  factory UserModel.mockDefault() {
    return const UserModel(
      id: 'usr_001',
      name: 'Enjelin Morgeana',
      email: 'enjelin@example.com',
      username: '@enjelin_morgeana',
      avatarUrl: 'assets/images/avatar_clean.png',
    );
  }

  UserModel copyWith({
    String? id,
    String? name,
    String? email,
    String? username,
    String? avatarUrl,
  }) {
    return UserModel(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      username: username ?? this.username,
      avatarUrl: avatarUrl ?? this.avatarUrl,
    );
  }

  @override
  List<Object?> get props => [id, name, email, username, avatarUrl];
}

