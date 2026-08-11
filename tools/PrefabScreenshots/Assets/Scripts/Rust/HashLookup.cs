using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;

public class HashLookup
{
	public static HashLookup Global = new();

	private Dictionary<uint, string> uid2str = new();
	private Dictionary<string, uint> str2uid = new();

	public static uint ManifestHash(string str)
	{
		return string.IsNullOrEmpty(str) ? 0 : BitConverter.ToUInt32(new MD5CryptoServiceProvider().ComputeHash(Encoding.UTF8.GetBytes(str)), 0);
	}

	public uint Add(string str)
	{
		if (str2uid.TryGetValue(str, out var uid))
		{
			return uid;
		}
		uid = str2uid[str] = ManifestHash(str);
		uid2str[uid] = str;
		return uid;
	}

	public string this[uint uid]
	{
		get
		{
			if (!uid2str.ContainsKey(uid))
			{
				return null;
			}

			return uid2str[uid];
		}
	}

	public uint this[string str]
	{
		get
		{
			if (str2uid.TryGetValue(str, out var uid))
			{
				return uid;
			}
			var val = str2uid[str] = ManifestHash(str);
			uid2str[val] = str;
			return val;
		}
	}
}
