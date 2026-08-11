using System.Collections.Generic;
using UnityEngine;
using Facepunch;
using System;
using System.Diagnostics;
using Humanlights.Extensions;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using UnityEngine.Rendering.PostProcessing;
using Debug = UnityEngine.Debug;
#if UNITY_EDITOR
using UnityEditor;
#endif

[ExecuteInEditMode]
public class SnapShotter : SingletonComponent<SnapShotter>
{
	public float ResolutionMultiply = 2f;
	public Vector2 NormalResolution, SideResolution;

	public static Shader StandardShader => Shader.Find("Universal Render Pipeline/Lit");
	public static Shader ParticleShader => Shader.Find("Universal Render Pipeline/Particles/Simple Lit");
	public static Shader FlareShader => Shader.Find("FX/Flare");
	public static readonly int RustMainTexId = Shader.PropertyToID("_MainTex");
	public static readonly int RustBaseColorMapId = Shader.PropertyToID("_BaseColorMap");
	public static readonly int MainTexId = Shader.PropertyToID("_BaseMap");
	public static readonly int SurfaceId = Shader.PropertyToID("_Surface");
	public static readonly int DstBlendId = Shader.PropertyToID("_DstBlend");
	public static readonly int DstBlendAlphaId = Shader.PropertyToID("_DstBlendAlpha");
	public static readonly int SrcBlendId = Shader.PropertyToID("_SrcBlend");
	public static readonly int ZWriteId = Shader.PropertyToID("_ZWrite");
	public static readonly int BlendId = Shader.PropertyToID("_Blend");
	public static readonly int EmissionColorId = Shader.PropertyToID("_EmissionColor");
	public static readonly int PreserveSpecularId = Shader.PropertyToID("_BlendModePreserveSpecular");

	public Camera Camera;
	public Bounds Bounds;
	public float ScaleOffset = 3f;
	public int Index;
	public Transform Pivot;
	public PostProcessVolume Volume;
	public PostProcessLayer Layer;
	public Transform Model;
	public GameObject ModelRef;

	internal List<MeshRenderer> _lastRenderers = new();

	public static string Folder
	{
		get
		{
			var folder = "Shots";
			OsEx.Folder.Create(folder);
			return folder;
		}
	}

	public void Update()
	{
		if (Processor.Instance == null || Processor.Instance.prefabs == null)
		{
			return;
		}

		SetIndex(Index);
	}

	public void RefreshModel()
	{
		if (Model != null)
		{
			Destroy(Model.gameObject);
			DestroyImmediate(ModelRef, true);
			Model = null;
			ModelRef = null;
		}

		var id = Processor.Instance.prefabs.prefabsList[Index];
		if (Processor.Instance.prefabs.GetAsset(id) is GameObject go)
		{
			ModelRef = go;
			Model = Instantiate(go).transform;
			Model.SetParent(Pivot);
			Model.SetLocalPositionAndRotation(Vector3.zero, Quaternion.identity);
			Model.name = HashLookup.Global[id];
		}
	}

	public bool IsFullyTransparent(Texture2D texture)
	{
		var pixels = texture.GetPixels32();

		for (int i = 0; i < pixels.Length; i++)
		{
			if (pixels[i].a != 0)
				return false;
		}

		return true;
	}

	public void TakeSnapshot(bool side = false)
	{
		var child = GetIndex(Index);
		var lastChildPosition = child == null ? Vector3.zero : child.transform.position;
		var lastChildRotation = child == null ? Vector3.zero : child.rotation.eulerAngles;
		var lastPivotPosition = Pivot.transform.position;
		var lastPivotRotation = Pivot.transform.rotation.eulerAngles;
		var lastCameraRotation = Camera.transform.rotation.eulerAngles;
		var lastProfile = Volume.profile;
		var lastAliasing = Layer.antialiasingMode;

		if (side)
		{
			Pivot.transform.rotation = Quaternion.Euler(Vector3.zero);

			if (child != null)
			{
				child.transform.position = Vector3.zero;
				child.rotation = Quaternion.Euler(0f, 90f, 0f);
			}
		}

		var renderTexture = new RenderTexture((int)((side ? SideResolution.x : NormalResolution.x) * ResolutionMultiply), (int)((side ? SideResolution.y : NormalResolution.y) * ResolutionMultiply), 24, RenderTextureFormat.ARGB32)
		{
			useMipMap = false,
			autoGenerateMips = false,
			antiAliasing = 1
		};
		Camera.clearFlags = CameraClearFlags.SolidColor;
		Camera.backgroundColor = new Color(0, 0, 0, 0);
		Camera.targetTexture = renderTexture;
		Camera.Render();

		RenderTexture.active = renderTexture;

		var image = new Texture2D(renderTexture.width, renderTexture.height);
		image.alphaIsTransparency = true;
		image.ReadPixels(new Rect(0, 0, renderTexture.width, renderTexture.height), 0, 0);
		image.Apply();

		var bytes = image.EncodeToPNG();

		RenderTexture.active = null;
		Camera.targetTexture = null;

		try
		{
			var name = Pivot.childCount > 0 ? PrefabLookup.ManifestHash(Model.name).ToString() : "sample";
			var path = $"{Folder}\\{name}{(side ? ".side" : "")}.png";
			if (!IsFullyTransparent(image))
			{
				OsEx.File.Create(path, bytes);
			}
		}
		catch (Exception ex)
		{
			Debug.LogWarning($"{Index} failed / {Pivot.childCount - 1}\n{ex}");
		}

		DestroyImmediate(image);
		DestroyImmediate(renderTexture);

		if (side)
		{
			Camera.transform.rotation = Quaternion.Euler(lastCameraRotation);
			Layer.antialiasingMode = lastAliasing;
			Volume.profile = lastProfile;
			Pivot.transform.position = lastPivotPosition;
			Pivot.rotation = Quaternion.Euler(lastPivotRotation);

			if (child != null)
			{
				child.transform.position = lastChildPosition;
				child.transform.rotation = Quaternion.Euler(lastChildRotation);
			}
		}
	}

	public void SetIndex(int index)
	{
		if (Index == index)
		{
			return;
		}

		RefreshModel();

		Index = index;

		var count = Processor.Instance.prefabs.prefabsList.Count;
		if (index > count - 1)
		{
			Index = count - 1;
		}
		else if (index < 0)
		{
			Index = 0;
		}

		foreach (Transform c in Pivot)
		{
			c.gameObject.SetActive(false);
		}

		Bounds = default;
		_lastRenderers.Clear();

		if (Model != null)
		{
			Model.gameObject.SetActive(true);
			Model.gameObject.transform.rotation = Quaternion.identity;
			Model.gameObject.transform.localScale = Vector3.one;

			ProcessPrefabMissingMaterials(Model.gameObject);
			ScalePrefabToCamera ();
		}
	}

	public Transform GetIndex(int index)
	{
		SetIndex(index);
		return Model;
	}

	public void ProcessPrefabMissingMaterials(GameObject prefab)
	{
		HandleObject(prefab.transform);

		foreach (Transform tr in prefab.transform)
		{
			HandleObject(tr);

			ProcessPrefabMissingMaterials(tr.gameObject);
		}

		void HandleObject(Transform obj)
		{
			if (obj.name.Contains("hlod", StringComparison.CurrentCultureIgnoreCase))
			{
				obj.SetActive(false);
				return;
			}

			var meshRenderer = obj.GetComponent<MeshRenderer>();
			if (meshRenderer != null && meshRenderer.enabled)
			{
				Bounds.Encapsulate(meshRenderer.bounds);
				for(int i = 0; i < meshRenderer.sharedMaterials.Length; i++)
				{
					var material = meshRenderer.sharedMaterials[i];
					if (material == null)
					{
						obj.SetActive(false);
						continue;
					}

					if (material.shader == StandardShader || material.shader == FlareShader)
					{
						continue;
					}

					var rustTex = material.GetTexture(RustMainTexId) ?? material.GetTexture(RustBaseColorMapId) ?? material.GetTexture(MainTexId);
					var currentShaderName = material.shader.name;

					var isFoliage = currentShaderName.Contains("foliage", StringComparison.CurrentCultureIgnoreCase);
					var isFlare = currentShaderName.Contains("fx", StringComparison.CurrentCultureIgnoreCase) || currentShaderName.Contains("flare", StringComparison.CurrentCultureIgnoreCase);
					var isTransparent = isFoliage || isFlare || material.renderQueue > 2000;
					var isParticle = currentShaderName.Contains("particle", StringComparison.CurrentCultureIgnoreCase);

					if (isParticle)
					{
						material.shader = ParticleShader;
					}
					if (isFlare)
					{
						obj.SetActive(false);
						material.shader = FlareShader;
					}
					else
					{
						material.shader = StandardShader;
					}

					if (isTransparent)
					{
						material.SetOverrideTag("RenderType", "Transparent");
						material.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
						material.SetFloat(SurfaceId, 1);
						material.SetFloat(BlendId, 0);
						material.SetFloat(PreserveSpecularId, 0);
						material.SetFloat(DstBlendId, 10);
						material.SetFloat(DstBlendAlphaId, 10);
						material.SetFloat(SrcBlendId, 5);
						material.SetFloat(ZWriteId, 0);
						material.renderQueue = 3000;
					}

					material.SetColor(EmissionColorId, Color.clear);

					if (rustTex)
					{
						material.mainTexture = rustTex;
					}
				}
				_lastRenderers.Add(meshRenderer);
			}
		}
	}

	public void ScalePrefabToCamera()
	{
		Camera.orthographic = true;
		Camera.orthographicSize = Mathf.Max(Bounds.extents.y, Bounds.extents.x / Camera.aspect) + ScaleOffset;

		Vector3 center = Bounds.center;
		float radius = Bounds.extents.magnitude;
		float fov = Camera.fieldOfView * Mathf.Deg2Rad;
		float distance = (radius / Mathf.Sin(fov / 2f)) - ScaleOffset;
		Camera.transform.position = center - Camera.transform.forward * distance;
	}

	public void OnDrawGizmos()
	{
		foreach (var renderer in _lastRenderers)
		{
			Gizmos.color = Color.red;
			Gizmos.DrawWireCube(renderer.bounds.center, renderer.bounds.size);
		}

		Gizmos.color = Color.blue;
		Gizmos.DrawWireCube(Bounds.center, Bounds.size);
	}
}

#if UNITY_EDITOR

[CustomEditor(typeof(SnapShotter))]
public class SnapShotterEditor : Editor
{
	internal SnapShotter _instance => target as SnapShotter;

	public override void OnInspectorGUI()
	{
		base.OnInspectorGUI();

		GUILayout.BeginHorizontal();

		if (GUILayout.Button("Take Snapshot", GUILayout.Height(25)))
		{
			_instance.TakeSnapshot();
			AssetDatabase.Refresh();
			AssetDatabase.SaveAssets();
		}

		if (GUILayout.Button("Take Snapshot (Side)", GUILayout.Height(25)))
		{
			_instance.TakeSnapshot(true);
			AssetDatabase.Refresh();
			AssetDatabase.SaveAssets();
		}

		GUILayout.EndHorizontal();

		GUILayout.BeginHorizontal();

		if (GUILayout.Button("Take All Snapshots", GUILayout.Height(25)))
		{
			_instance.SetIndex(0);

			for (int i = 0; i < Processor.Instance.prefabs.prefabsList.Count; i++)
			{
				_instance.SetIndex(i);
				_instance.TakeSnapshot();
			}
		}

		if (GUILayout.Button("Take All Snapshots (Side)", GUILayout.Height(25)))
		{
			_instance.SetIndex(0);

			for (int i = 0; i < Processor.Instance.prefabs.prefabsList.Count; i++)
			{
				_instance.SetIndex(i);
				_instance.TakeSnapshot(true);
			}
		}

		GUILayout.EndHorizontal();


		GUILayout.BeginHorizontal();

		if (GUILayout.Button("First"))
		{
			_instance.SetIndex(0);
		}

		if (GUILayout.Button("Previous"))
		{
			_instance.SetIndex(_instance.Index - 1);
		}

		if (GUILayout.Button("Next"))
		{
			_instance.SetIndex(_instance.Index + 1);
		}

		if (GUILayout.Button("Last"))
		{
			_instance.SetIndex(Processor.Instance.prefabs.prefabsList.Count - 1);
		}

		GUILayout.EndHorizontal();

		// if ( GUILayout.Button ( "Apply Icons", GUILayout.Height ( 25 ) ) )
		// {
		//     _instance.ApplyIcons ();
		// }
	}
}

#endif
