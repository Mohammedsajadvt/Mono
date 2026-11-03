import 'package:equatable/equatable.dart';

class ContactModel extends Equatable {
  final String id;
  final String name;
  final String? initials;
  final String? avatarUrl;

  const ContactModel({
    required this.id,
    required this.name,
    this.initials,
    this.avatarUrl,
  });

  String get computedInitials {
    if (initials != null && initials!.trim().isNotEmpty) {
      return initials!.trim().toUpperCase();
    }
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.length >= 2 && parts[0].isNotEmpty && parts[1].isNotEmpty) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    if (name.trim().isNotEmpty) {
      return name.trim().substring(0, name.trim().length >= 2 ? 2 : 1).toUpperCase();
    }
    return 'CO';
  }

  factory ContactModel.fromJson(Map<String, dynamic> json) {
    return ContactModel(
      id: json['id'].toString(),
      name: json['name']?.toString() ?? 'Contact',
      initials: json['initials']?.toString(),
      avatarUrl: json['avatar_url']?.toString(),
    );
  }

  @override
  List<Object?> get props => [id, name, initials, avatarUrl];
}

